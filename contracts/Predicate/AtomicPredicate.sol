pragma solidity ^0.5.0;
pragma experimental ABIEncoderV2;

import {DataTypes as types} from "../DataTypes.sol";

interface AtomicPredicate {
    function decideTrue(bytes[] calldata) external;
    function decide(bytes[] calldata) external pure returns (bool);
}
