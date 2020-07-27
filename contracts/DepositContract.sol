pragma solidity ^0.5.0;
pragma experimental ABIEncoderV2;

/* External Imports */
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";

/* Internal Imports */
import {DataTypes as types} from "./DataTypes.sol";
import {Commitment} from "./Commitment.sol";
import {DisputeKind} from "./Dispute/DisputeKind.sol";
import {ExitDispute} from "./Dispute/ExitDispute.sol";
import "./Predicate/CompiledPredicate.sol";
import "./Library/Deserializer.sol";

/**
 * @notice Deposit contract is contract which manages tokens that users deposit when entering plasma.
 * One deposit contract exists for each ERC20 contract. It keeps track of how much funds are deposited in a plasma.
 * Client have to interact with this contract in order to enter or exiting from the plasma.
 */
contract DepositContract {
    using SafeMath for uint256;

    /* Events */
    /**
     * @notice Emitted when checkpoint is finalized
     * @param checkpointId Hash of the checkpoint property
     * @param checkpoint Finalized checkpoint
     */
    event CheckpointFinalized(
        bytes32 checkpointId,
        types.StateUpdate checkpoint
    );

    /**
     * @notice Emitted when exit is finalized
     * @param exitId Hash of the exit property
     */
    event ExitFinalized(bytes32 exitId, types.StateUpdate exit);

    /**
     * @notice Emitted when deposit range is extended
     * @param newRange new range added to depositedRange
     */
    event DepositedRangeExtended(types.Range newRange);

    /**
     * @notice Emitted when deposited range is removed
     * @param removedRange range to be removed
     */
    event DepositedRangeRemoved(types.Range removedRange);

    /* Public Variables and Mappings*/
    ERC20 public erc20;
    Commitment public commitment;
    address public checkpointDisputeAddress;
    address public exitDisputeAddress;

    // totalDeposited is the most right coin id which has been deposited
    uint256 public totalDeposited;
    // depositedRanges are currently deposited ranges
    mapping(uint256 => types.Range) public depositedRanges;
    mapping(bytes32 => bool) public checkpoints;

    constructor(
        address _erc20,
        address _commitment,
        address _checkpointDispute,
        address _exitDispute
    ) public {
        erc20 = ERC20(_erc20);
        commitment = Commitment(_commitment);
        checkpointDisputeAddress = _checkpointDispute;
        exitDisputeAddress = _exitDispute;
    }

    /**
     * @notice Deposit ERC20 token to deposit contract with initial state represented as Property struct.
     * @dev Client needs to approve this contract to transfer specified ERC20 token using `approve` method of ERC20 token before calling this method.
     * @param _amount Token amount to deposit into plasma.
     * @param _initialState Initial state of deposited token. OwnershipProperty is used for ordinary cases.
     */
    function deposit(uint256 _amount, types.Property memory _initialState)
        public
    {
        require(
            totalDeposited < 2**256 - 1 - _amount,
            "DepositContract: totalDeposited exceed max uint256"
        );
        require(
            erc20.transferFrom(msg.sender, address(this), _amount),
            "must approved"
        );
        types.Range memory depositRange = types.Range({
            start: totalDeposited,
            end: totalDeposited.add(_amount)
        });
        types.StateUpdate memory stateUpdate = types.StateUpdate({
            depositContractAddress: address(this),
            range: depositRange,
            blockNumber: getLatestPlasmaBlockNumber(),
            stateObject: _initialState
        });
        extendDepositedRanges(_amount);
        _finalizeCheckpoint(stateUpdate);
    }

    // TODO: make this private
    function extendDepositedRanges(uint256 _amount) public {
        uint256 oldStart = depositedRanges[totalDeposited].start;
        uint256 oldEnd = depositedRanges[totalDeposited].end;
        uint256 newStart;
        if (oldStart == 0 && oldEnd == 0) {
            // Creat a new range when the rightmost range has been removed
            newStart = totalDeposited;
        } else {
            // Delete the old range and make a new one with the total length
            delete depositedRanges[oldEnd];
            newStart = oldStart;
        }
        uint256 newEnd = totalDeposited.add(_amount);
        depositedRanges[newEnd] = types.Range({start: newStart, end: newEnd});
        totalDeposited = totalDeposited.add(_amount);
        emit DepositedRangeExtended(
            types.Range({start: newStart, end: newEnd})
        );
    }

    // TODO: make this private
    function removeDepositedRange(
        types.Range memory _range,
        uint256 _depositedRangeId
    ) public {
        require(
            isSubrange(_range, depositedRanges[_depositedRangeId]),
            "range must be of a depostied range (the one that has not been exited)"
        );


            types.Range storage encompasingRange
         = depositedRanges[_depositedRangeId];
        /*
         * depositedRanges makes O(1) checking existence of certain range.
         * Since _range is subrange of encompasingRange, we only have to check is each start and end are same or not.
         * So, there are 2 patterns for each start and end of _range and encompasingRange.
         * There are nothing todo for _range.start is equal to encompasingRange.start.
         */
        // Check start of range
        if (_range.start != encompasingRange.start) {
            types.Range memory leftSplitRange = types.Range({
                start: encompasingRange.start,
                end: _range.start
            });
            depositedRanges[leftSplitRange.end] = leftSplitRange;
        }
        // Check end of range
        if (_range.end == encompasingRange.end) {
            /*
             * Deposited range Id is end value of the range, we must remove the range from depositedRanges
             *     when range.end is changed.
             */
            delete depositedRanges[encompasingRange.end];
        } else {
            encompasingRange.start = _range.end;
        }

        emit DepositedRangeRemoved(_range);
    }

    function finalizeCheckpoint(types.StateUpdate memory _checkpoint) public {
        require(
            msg.sender == checkpointDisputeAddress,
            "Only called from checkpoint dispute"
        );

        _finalizeCheckpoint(_checkpoint);
    }

    /**
     * @notice Method used to finalize a new checkpoint.
     * @dev Given checkpoint property, checks if the property is already decided. If it's decided to true,
     * create a new checkpoint with the property and emit an CheckpointFinalized event.
     * @param _checkpoint StateUpdate instance of checkpoint predicate.
     */
    function _finalizeCheckpoint(types.StateUpdate memory _checkpoint) private {
        // require called from CheckpointDispute or itself

        bytes32 checkpointId = getId(_checkpoint);
        // store the checkpoint
        checkpoints[checkpointId] = true;
        emit CheckpointFinalized(checkpointId, _checkpoint);
    }

    /**
     * @notice ExitDisputeContracts calls this method to finalize withdrawal process. If succeed, ethereum account receives deposited amount corresponding
     * to the state.
     * @dev finalizeExit checks if given exit property is already decided. If it's decided, it sends token back to the owner.
     * The steps of finalizeExit.
     *     1. Serialize exit property
     *     2. check the property is decided by Adjudication Contract.
     *     3. Transfer asset to payout contract corresponding to StateObject.
     *     Please alse see https://docs.plasma.group/projects/spec/en/latest/src/02-contracts/deposit-contract.html#finalizeexit
     * @param _exit A stateUpdate which is an instance of exit predicate and its inputs are range and StateUpdate that exiting account wants to withdraw.
     *     _exitProperty can be a property of either ExitPredicate or ExitDepositPredicate.
     * @param _depositedRangeId Id of deposited range
     * @return returns finalized StateUpdate of specified exit property
     */
    function finalizeExit(
        types.StateUpdate memory _exit,
        uint256 _depositedRangeId
    ) public {
        bytes32 exitId = getId(_exit);
        // get payout contract address
        address payout = CompiledPredicate(_exit.stateObject.predicateAddress)
            .payoutContractAddress();
        // Check that we are authorized to finalize this exit
        require(
            payout == msg.sender,
            "finalizeExit must be called from payout contract"
        );

        ExitDispute exitDispute = ExitDispute(exitDisputeAddress);
        types.Decision decision = exitDispute.getClaimDecision(_exit);

        require(
            decision == types.Decision.True,
            "exit claim must be settled to true"
        );

        require(
            _exit.depositContractAddress == address(this),
            "depositContractAddress must be this contract address"
        );

        // Remove the deposited range
        removeDepositedRange(_exit.range, _depositedRangeId);
        //Transfer tokens to its predicate
        uint256 amount = _exit.range.end - _exit.range.start;
        erc20.transfer(payout, amount);
        emit ExitFinalized(exitId, _exit);
    }

    /* Helpers */
    function getId(types.StateUpdate memory _su)
        private
        pure
        returns (bytes32)
    {
        return keccak256(abi.encode(_su));
    }

    function getLatestPlasmaBlockNumber() private returns (uint256) {
        return commitment.currentBlock();
    }

    function isSubrange(
        types.Range memory _subrange,
        types.Range memory _surroundingRange
    ) public pure returns (bool) {
        return
            _subrange.start >= _surroundingRange.start &&
            _subrange.end <= _surroundingRange.end;
    }
}
