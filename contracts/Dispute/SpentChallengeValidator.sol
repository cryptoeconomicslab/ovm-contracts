pragma solidity ^0.5.0;
pragma experimental ABIEncoderV2;

import {DataTypes as types} from "../DataTypes.sol";
import {Utils} from "../Utils.sol";
import "../Library/Deserializer.sol";
import {CompiledPredicate} from "../Predicate/CompiledPredicate.sol";

contract SpentChallengeValidator {
    /**
     * _inputs: [encode(stateUpdate)]
     * _challengeInputs: [encode(transaction)]
     * _witness: [signature]
     */
    function validateSpentChallenge(
        bytes[] calldata _inputs,
        bytes[] calldata _challengeInputs,
        bytes[] calldata _witness
    ) external view {
        types.StateUpdate memory stateUpdate = abi.decode(
            _inputs[0],
            (types.StateUpdate)
        );
        types.Transaction memory transaction = abi.decode(
            _challengeInputs[0],
            (types.Transaction)
        );
        require(
            keccak256(transaction.nextStateObject.inputs[0]) ==
                keccak256(stateUpdate.stateObject.inputs[0]),
            "token must be same"
        );
        types.Range memory range = transaction.range;
        types.Range memory subrange = stateUpdate.range;
        require(
            range.start <= subrange.start && subrange.end <= range.end,
            "range must contain subrange"
        );

        types.StateUpdate memory challengeStateUpdate = Deserializer
            .deserializeStateUpdate(transaction.nextStateObject);
        CompiledPredicate predicate = CompiledPredicate(
            challengeStateUpdate.stateObject.predicateAddress
        );
        require(
            predicate.decide(challengeStateUpdate.stateObject.inputs, _witness),
            "State object decided to false"
        );
    }
}
