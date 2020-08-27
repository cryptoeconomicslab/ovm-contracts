pragma solidity ^0.5.0;
pragma experimental ABIEncoderV2;

import {DataTypes as types} from "../DataTypes.sol";
import {Utils} from "../Utils.sol";
import {DisputeHelper} from "./DisputeHelper.sol";
import {CompiledPredicate} from "../Predicate/CompiledPredicate.sol";

contract SpentChallengeValidator is DisputeHelper {
    /**
     * _inputs: [encode(stateUpdate)]
     * _challengeInputs: [encode(transaction)]
     * _witness: [signature]
     */
    function validateSpentChallenge(
        types.StateUpdate memory stateUpdate,
        types.Transaction memory transaction,
        bytes[] memory _witness
    ) internal view {
        require(
            transaction.depositContractAddress ==
                stateUpdate.depositContractAddress,
            "token must be same"
        );
        // To support spending multiple state updates
        require(
            utils.hasIntersection(transaction.range, stateUpdate.range),
            "range must contain subrange"
        );
        require(
            transaction.maxBlockNumber >= stateUpdate.blockNumber,
            "blockNumber must be valid"
        );

        CompiledPredicate predicate = CompiledPredicate(
            stateUpdate.stateObject.predicateAddress
        );

        types.Property memory so = stateUpdate.stateObject;

        // inputs for stateObject property
        bytes[] memory inputs = new bytes[](2);
        inputs[0] = so.inputs[0];
        inputs[1] = abi.encode(transaction);

        require(
            predicate.decide(inputs, _witness),
            "State object decided to false"
        );
    }
}
