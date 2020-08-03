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
        bytes[] memory _inputs,
        bytes[] memory _challengeInputs,
        bytes[] memory _witness
    ) internal view {
        types.StateUpdate memory stateUpdate = abi.decode(
            _inputs[0],
            (types.StateUpdate)
        );
        types.Transaction memory transaction = abi.decode(
            _challengeInputs[0],
            (types.Transaction)
        );
        require(
            transaction.depositContractAddress ==
                stateUpdate.depositContractAddress,
            "token must be same"
        );
        require(
            utils.isSubrange(transaction.range, stateUpdate.range),
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
        inputs[1] = _challengeInputs[0];

        require(
            predicate.decide(inputs, _witness),
            "State object decided to false"
        );
    }
}
