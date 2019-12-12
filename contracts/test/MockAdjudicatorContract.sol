pragma solidity ^0.5.3;
pragma experimental ABIEncoderV2;

import {DataTypes as types} from "../DataTypes.sol";

/**
 * @title MockAdjudicationContract
 * @notice Mock adjudication contract for writing unit test
 */
contract MockAdjudicationContract {
    bool public fail;
    constructor(bool _fail) public {
        fail = _fail;
    }
    function isDecided(types.Property memory _property) public returns (bool) {
        return !fail;
    }
    function setPredicateDecision(bytes32 _gameId, bool _decision) public {}
}
