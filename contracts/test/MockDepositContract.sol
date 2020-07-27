pragma solidity ^0.5.0;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {DataTypes as types} from "../DataTypes.sol";
import "./MockToken.sol";
import "../Library/Deserializer.sol";

contract MockDepositContract {
    event CheckpointFinalized(types.StateUpdate checkpoint);

    ERC20 public erc20;
    bool private res;

    constructor(address mockToken) public {
        erc20 = MockToken(mockToken);
        res = true;
    }

    function setCheckpoints(bool _res) public {
        res = _res;
    }

    function deposit(uint256 _amount, types.Property memory _initialState)
        public
    {}

    function finalizeCheckpoint(types.StateUpdate memory _checkpoint) public {
        emit CheckpointFinalized(_checkpoint);
    }

    function finalizeExit(
        types.StateUpdate memory _exit,
        uint256 _depositedRangeId
    ) public {}

    function checkpoints(bytes32 id) public view returns (bool) {
        return res;
    }
}
