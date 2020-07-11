pragma solidity ^0.5.0;
pragma experimental ABIEncoderV2;
 
import {DataTypes as types} from "../DataTypes.sol";
import {Dispute} from './DisputeInterface.sol';
import {DisputeManager} from './DisputeManager.sol';
import {CheckpointChallenge} from './CheckpointChallenge.sol';
import {SpentChallenge} from './SpentChallenge.sol';
import "../Library/Deserializer.sol";
import {CompiledPredicate} from "../Predicate/CompiledPredicate.sol";
import {Utils} from "../Utils.sol";
import {CommitmentVerifier} from "../CommitmentVerifier.sol";

/**
 * # ExitDispute contract
 * A settled Exit means a StateUpdate is withdrawable.
 * Withdrawal exit is coin which hasn't been spent.
 * Exitable stateUpdate is StateUpdate which is not spended
 * and StateUpdate at which checkpoint decides.
 */
contract ExitDispute is Dispute {
    DisputeManager disputeManager;
    CommitmentVerifier commitmentVerifier;
    Utils utils;

    bytes EXIT_CLAIM = bytes("EXIT_CLAIM");
    bytes EXIT_SPENT_CHALLENTE = bytes("EXIT_SPENT_CHALLENGE");
    bytes EXIT_CHECKPOINT_CHALLENTE = bytes("EXIT_CHECKPOINT_CHALLENGE");

    event ExitClaimed(
        types.StateUpdate stateUpdate
    );

    event ExitChallenged(
        types.StateUpdate stateUpdate,
        bytes challengeType
    );

    event ExitSettled(types.StateUpdate);

    constructor(
        address _disputeManagerAddress,
        address _commitmentVerifierAddress,
        address _utilsAddress
    ) public {
        disputeManager = DisputeManager(_disputeManagerAddress);
        commitmentVerifier = CommitmentVerifier(_commitmentVerifierAddress);
        utils = Utils(_utilsAddress);
    }

    function claim(bytes[] calldata _inputs, bytes[] calldata _witness)
        external{
        // validate inputs
        require(
            _inputs.length == 1,
            "inputs length does not match. expected 1"
        );
        require(
            _witness.length == 1,
            "witness length does not match. expected 1"
        );
        types.Property memory suProperty = abi.decode(
            _inputs[0],
            (types.Property)
        );
        types.StateUpdate memory stateUpdate = Deserializer
            .deserializeStateUpdate(suProperty);
        types.InclusionProof memory inclusionProof = abi.decode(
            _witness[0],
            (types.InclusionProof)
        );
        bytes memory blockNumberBytes = abi.encode(stateUpdate.blockNumber);
        bytes32 root = utils.bytesToBytes32(
            commitmentVerifier.retrieve(blockNumberBytes)
        );
        require(
            commitmentVerifier.verifyInclusionWithRoot(
                keccak256(abi.encode(stateUpdate.stateObject)),
                stateUpdate.depositContractAddress,
                stateUpdate.range,
                inclusionProof,
                root
            ),
            "Inclusion verification failed"
        );
        // claim property to DisputeManager
        types.Property memory property = createProperty(_inputs[0], EXIT_CLAIM);
        disputeManager.claim(property);

        emit ExitClaimed(stateUpdate);
    }

    /**
     * challenge prove the exiting coin has been spent.
     * First element of challengeInputs must be either of
     * bytes("EXIT_SPENT_CHALLENGE") or bytes("EXIT_CHECKPOINT_CHALLENGE")
     */
    function challenge(
        bytes[] calldata _inputs,
        bytes[] calldata _challengeInputs,
        bytes[] calldata _witness
    ) external{
        require(
            _inputs.length == 1,
            "inputs length does not match. expected 1"
        );
        require(
            _challengeInputs.length == 1,
            "challenge inputs length does not match. expected 1"
        );
        require(
            _witness.length == 1,
            "witness length does not match. expected 1"
        );

        if (keccak256(_challengeInputs[0]) == keccak256(EXIT_SPENT_CHALLENTE)) {
            new SpentChallenge().verify(_inputs, _witness);
        } else if (keccak256(_challengeInputs[0]) == keccak256(EXIT_CHECKPOINT_CHALLENTE)) {
            new CheckpointChallenge().verify(_inputs, _witness);
        } else {
            revert("illegal challenge type");
        }
        disputeManager.challenge(createProperty(_inputs[0], EXIT_CLAIM), createProperty(_challengeInputs[0], _challengeInputs[0]));
        types.Property memory suProperty = abi.decode(
            _inputs[0],
            (types.Property)
        );
        types.StateUpdate memory stateUpdate = Deserializer
            .deserializeStateUpdate(suProperty);
        emit ExitChallenged(
            stateUpdate, _challengeInputs[0]
        );
    }

    function removeChallenge(
        bytes[] calldata _inputs,
        bytes[] calldata _challengeInputs,
        bytes[] calldata _witness
    ) external{}

    /**
     * prove exit is coin which hasn't been spent.
     * check checkpoint
     */
    function settle(bytes[] calldata _inputs) external{
        require(
            _inputs.length == 1,
            "inputs length does not match. expected 1"
        );
        types.Property memory property = createProperty(_inputs[0], EXIT_CLAIM);
        disputeManager.settleGame(property);

        types.Property memory suProperty = abi.decode(
            _inputs[0],
            (types.Property)
        );
        types.StateUpdate memory stateUpdate = Deserializer
            .deserializeStateUpdate(suProperty);

        emit ExitSettled(stateUpdate);
    }

    function createProperty(bytes memory suBytes, bytes memory kind)
        private
        view
        returns (types.Property memory)
    {
        bytes[] memory inputs = new bytes[](2);
        inputs[0] = kind;
        inputs[1] = suBytes;
        return types.Property(address(this), inputs);
    }
}
