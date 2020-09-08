pragma solidity ^0.5.0;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

import {DataTypes as types} from "../../DataTypes.sol";
import "../../Utils.sol";
import "../../DepositContract.sol";

contract OwnershipPayout {
    Utils utils;

    constructor(address utilsAddress) public {
        utils = Utils(utilsAddress);
    }

    /**
     * finalizeExit
     * @dev finalize exit and withdraw asset with ownership state.
     */
    function finalizeExit(
        address depositContractAddress,
        types.StateUpdate memory _exit,
        uint256 _depositedRangeId,
        address _owner
    ) public {
        DepositContract depositContract = DepositContract(
            depositContractAddress
        );
        depositContract.finalizeExit(_exit, _depositedRangeId);
        address owner = utils.bytesToAddress(_exit.stateObject.inputs[0]);
        uint256 amount = _exit.range.end - _exit.range.start;
        require(msg.sender == owner, "msg.sender must be owner");
        depositContract.erc20().transfer(_owner, amount);
    }

    function finalizeBatchExit(
        address depositContractAddress,
        types.StateUpdate[] memory _exits,
        uint256 _depositedRangeId,
        address _owner
    ) public {
        DepositContract depositContract = DepositContract(
            depositContractAddress
        );
        depositContract.finalizeBatchExit(_exits, _depositedRangeId);
        for (uint256 i = 0; i < _exits.length; i++) {
            types.StateUpdate memory _exit = _exits[i];
            address owner = utils.bytesToAddress(_exit.stateObject.inputs[0]);
            uint256 amount = _exit.range.end - _exit.range.start;
            require(msg.sender == owner, "msg.sender must be owner");
            depositContract.erc20().transfer(_owner, amount);
        }
    }
}
