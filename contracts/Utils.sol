pragma solidity ^0.5.0;
pragma experimental ABIEncoderV2;

import {DataTypes as types} from "./DataTypes.sol";

contract Utils {
    function getPropertyId(types.Property memory _property) public pure returns (bytes32) {
        return keccak256(abi.encode(_property));
    }
}
