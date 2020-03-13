pragma solidity ^0.5.0;
pragma experimental ABIEncoderV2;

import {DataTypes as types} from "../DataTypes.sol";
import {CompiledPredicate} from "../Predicate/CompiledPredicate.sol";

/**
 * @title MockCompiledPredicate
 * @notice Mock of compiled predicate. This can be used as MockStateUpdatePredicate or MockTransactionPredicate.
 */
contract MockCompiledPredicate is CompiledPredicate {
    address public payoutContractAddress = address(this);
    constructor() public {}
    function isValidChallenge(
        bytes[] memory _inputs,
        bytes[] memory _challengeInputs,
        types.Property memory _challenge
    ) public view returns (bool) {
        return true;
    }
    function getChild(bytes[] calldata inputs, bytes[] calldata challengeInput)
        external
        view
        returns (types.Property memory)
    {
        require(false, "mock do not support getChild");
    }
    function decide(bytes[] memory _inputs, bytes[] memory _witness)
        public
        view
        returns (bool)
    {
        return true;
    }
    function decideTrue(bytes[] memory _inputs, bytes[] memory _witness)
        public
    {}
}
