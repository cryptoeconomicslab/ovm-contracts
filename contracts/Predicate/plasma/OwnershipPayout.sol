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
        types.Property memory _exitProperty,
        uint256 _depositedRangeId,
        address _owner
    ) public {
        DepositContract depositContract = DepositContract(
            depositContractAddress
        );
        types.StateUpdate memory stateUpdate = depositContract.finalizeExit(
            _exitProperty,
            _depositedRangeId
        );
        address owner = utils.bytesToAddress(stateUpdate.stateObject.inputs[0]);
        uint256 amount = stateUpdate.range.end - stateUpdate.range.start;
        require(msg.sender == owner, "msg.sender must be owner");
        depositContract.erc20().transfer(_owner, amount);
    }
}
