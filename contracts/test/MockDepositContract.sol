pragma solidity ^0.5.0;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {DataTypes as types} from "./DataTypes.sol";
import "./MockToken.sol";
import "./Library/Deserializer.sol";

contract MockDepositContract {
    ERC20 public erc20;
    constructor(address mockToken) public {
        erc20 = MockToken(mockToken);
    }

    function deposit(uint256 _amount, types.Property memory _initialState)
        public
    {}

    function finalizeExit(
        types.Property memory _exitProperty,
        uint256 _depositedRangeId
    ) public returns (types.StateUpdate memory) {
        return Deserializer.deserializeExit(_exitProperty).stateUpdate;
    }

}
