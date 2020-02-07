pragma solidity ^0.5.0;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

import {DataTypes as types} from "../../DataTypes.sol";
import {
    UniversalAdjudicationContract
} from "../UniversalAdjudicationContract.sol";
import "../../Utils.sol";
import "../../DepositContract.sol";

contract OrderPayout {
    struct SwapStateObject {
        address maker;
        address cToken;
        uint256 cAmount;
        uint256 minBlockNumber;
        uint256 maxBlockNumber;
    }
    struct DisputingSwap {
        uint256 amount;
        uint256 createdAt;
        SwapStateObject swap;
        bytes32 deprecateConditionId;
    }

    mapping(bytes32 => DisputingSwap) public swaps;
    UniversalAdjudicationContract adjudicationContract;
    Utils utils;

    constructor(address adjudicationContractAddress, address utilsAddress)
        public
    {
        adjudicationContract = UniversalAdjudicationContract(
            adjudicationContractAddress
        );
        utils = Utils(utilsAddress);
    }

    /**
    * finalizeExit
    * @dev finalize exit and withdraw asset with ownership state.
    */
    function finalizeExit(
        address depositContractAddress,
        types.Property memory _exitProperty,
        uint256 _depositedRangeId,
        address _owner
    ) public {
        DepositContract depositContract = DepositContract(
            depositContractAddress
        );
        types.Exit memory exit = depositContract.finalizeExit(
            _exitProperty,
            _depositedRangeId
        );
        SwapStateObject memory swapStateObject = Swap({
            maker: utils.bytesToAddress(exit.stateUpdate.stateObject.inputs[0]),
            cToken: utils.bytesToAddress(
                exit.stateUpdate.stateObject.inputs[1]
            ),
            cAmount: abi.decode(
                exit.stateUpdate.stateObject.inputs[2],
                (uint256)
            ),
            minBlockNumber: abi.decode(
                exit.stateUpdate.stateObject.inputs[3],
                (uint256)
            ),
            maxBlockNumber: abi.decode(
                exit.stateUpdate.stateObject.inputs[4],
                (uint256)
            )
        });
        uint256 amount = exit.subrange.end - exit.subrange.start;
        require(msg.sender == owner, "msg.sender must be owner");
        DisputingSwap memory swap = DisputingSwap({
            amount: amount,
            createdAt: block.number,
            swap: swapStateObject,
            deprecateConditionId: keccak256(
                abi.encode(exit.stateUpdate.stateObject)
            )
        });
        swaps[keccak256(abi.encode(swapStateObject))] = swap;
    }

    function challenge(
        bytes32 ordrId,
        types.Property memory stateObject,
        types.Property memory transaction
    ) public {
        bytes[] memory childInputs = new bytes[](6);
        childInputs[0] = stateObject.inputs[0];
        childInputs[1] = stateObject.inputs[1];
        childInputs[2] = stateObject.inputs[2];
        childInputs[3] = stateObject.inputs[3];
        childInputs[4] = stateObject.inputs[4];
        childInputs[5] = abi.encode(transaction);
        types.Property memory stateObjectWithTx = types.Property({
            predicateAddress: stateObject.predicateAddress,
            inputs: childInputs
        });
        require(adjudicatorContract.isDecided(stateObjectWithTx));
        // transaction.inputs[3]
        // move to swap payout contract
    }

    function withdraw(bytes32 ordrId) public {
        require(swaps[ordrId].created < block.number + 100);
        depositContract.erc20().transfer(
            swaps[ordrId].SwapStateObject.maker,
            swaps[ordrId].amount
        );
    }
}
