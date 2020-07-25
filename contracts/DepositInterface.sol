pragma solidity ^0.5.0;
pragma experimental ABIEncoderV2;

import {DataTypes as types} from "./DataTypes.sol";

interface Deposit {
    function finalizeCheckpoint(types.StateUpdate calldata _stateUpdate)
        external;

    function finalizeExit(
        types.StateUpdate calldata _stateUpdate,
        uint256 _depositedRangeId
    ) external;
}
