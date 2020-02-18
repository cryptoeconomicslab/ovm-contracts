pragma solidity ^0.5.0;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

import {DataTypes as types} from "../../DataTypes.sol";
import {
    UniversalAdjudicationContract
} from "../../UniversalAdjudicationContract.sol";
import "../../Utils.sol";
import "../../DepositContract.sol";

contract SwapPayout {
    struct SwapStateObject {
        address newOwner;
        address prevOwner;
        address cToken;
        types.Range cRange;
        uint256 blockNumber;
    }
    struct DisputingSwap {
        address depositContractAddress;
        uint256 amount;
        uint256 createdAt;
        SwapStateObject swap;
        bytes32 deprecateConditionId;
    }

    mapping(bytes32 => DisputingSwap) public swaps;
    UniversalAdjudicationContract adjudicationContract;
    Utils utils;

    constructor(address adjudicationAddress, address utilsAddress) public {
        adjudicationContract = UniversalAdjudicationContract(
            adjudicationAddress
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
        SwapStateObject memory swapStateObject = SwapStateObject({
            newOwner: utils.bytesToAddress(
                exit.stateUpdate.stateObject.inputs[0]
            ),
            prevOwner: utils.bytesToAddress(
                exit.stateUpdate.stateObject.inputs[1]
            ),
            cToken: utils.bytesToAddress(
                exit.stateUpdate.stateObject.inputs[2]
            ),
            cRange: utils.bytesToRange(exit.stateUpdate.stateObject.inputs[3]),
            blockNumber: abi.decode(
                exit.stateUpdate.stateObject.inputs[4],
                (uint256)
            )
        });
        uint256 amount = exit.subrange.end - exit.subrange.start;
        require(msg.sender == _owner, "msg.sender must be owner");
        DisputingSwap memory swap = DisputingSwap({
            depositContractAddress: depositContractAddress,
            amount: amount,
            createdAt: block.number,
            swap: swapStateObject,
            deprecateConditionId: keccak256(
                abi.encode(exit.stateUpdate.stateObject)
            )
        });
        swaps[keccak256(abi.encode(swapStateObject))] = swap;
    }

    function withdraw(bytes32 swapId) public {
        DisputingSwap memory swap = swaps[swapId];
        require(swap.createdAt < block.number + 100);
        DepositContract depositContract = DepositContract(
            swap.depositContractAddress
        );
        depositContract.erc20().transfer(swap.swap.prevOwner, swap.amount);
    }
}
