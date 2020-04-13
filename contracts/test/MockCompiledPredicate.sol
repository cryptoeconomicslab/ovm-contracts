pragma solidity ^0.6.0;
pragma experimental ABIEncoderV2;

import {DataTypes as types} from "../DataTypes.sol";
import {CompiledPredicate} from "../Predicate/CompiledPredicate.sol";

/**
 * @title MockCompiledPredicate
 * @notice Mock of compiled predicate. This can be used as MockStateUpdatePredicate or MockTransactionPredicate.
 */
contract MockCompiledPredicate is CompiledPredicate {
    address public override payoutContractAddress = address(this);

    constructor() public {}

    function isValidChallenge(
        bytes[] memory _inputs,
        bytes[] memory _challengeInputs,
        types.Property memory _challenge
    ) public view override returns (bool) {
        return true;
    }

    function decide(bytes[] memory _inputs, bytes[] memory _witness)
        public
        view
        override
        returns (bool)
    {
        return true;
    }

    function decideTrue(bytes[] memory _inputs, bytes[] memory _witness)
        public
        override
    {}

    function decideWithWitness(bytes[] memory _inputs, bytes[] memory _witness)
        public
        override
        returns (bool)
    {
        return true;
    }

    function getChild(bytes[] memory inputs, bytes[] memory challengeInput)
        public
        view
        override
        returns (types.Property memory)
    {
        return
            types.Property({predicateAddress: address(this), inputs: inputs});
    }
}
