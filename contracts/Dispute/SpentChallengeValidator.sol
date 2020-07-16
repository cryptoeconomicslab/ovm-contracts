pragma solidity ^0.5.0;
pragma experimental ABIEncoderV2;

import {DataTypes as types} from "../DataTypes.sol";
import {Utils} from "../Utils.sol";
import "../Library/Deserializer.sol";
import {CompiledPredicate} from "../Predicate/CompiledPredicate.sol";

contract SpentChallengeValidator {
    Utils private utils;

    constructor(
        address _utilsAddress
    ) public {
        utils = Utils(_utilsAddress);
    }
    /**
     * _inputs: [encode(stateUpdate)]
     * _challengeInputs: [encode(transaction)]
     * _witness: [signature]
     */
    function validateSpentChallenge(
        bytes[] memory _inputs,
        bytes[] memory _challengeInputs,
        bytes[] memory _witness
    ) internal {
        // TODO
        // TransactionがStateUpdateを更新するようなTransactionであることの確認
        // range, depositContractAddressのcheck
        // isValidStateTransactionPredocate.dicedeを参考に
        types.Property memory stateUpdate = abi.decode(
            _inputs[0],
            (types.Property)
        );
        types.Property memory transaction = abi.decode(
            _challengeInputs[0],
            (types.Property)
        );
        require(
            keccak256(transaction.inputs[0]) ==
                keccak256(stateUpdate.inputs[0]),
            "token must be same"
        );
        types.Range memory range = utils.bytesToRange(transaction.range);
        types.Range memory subrange = utils.bytesToRange(stateUpdate.range);
        require(
            range.start <= subrange.start && subrange.end <= range.end,
            "range must contain subrange"
        );

        // signatureのcheck
        // IsValidSignaturePredicate.disideを参考に

        types.StateUpdate memory challengeStateUpdate = Deserializer
            .deserializeStateUpdate(transaction);
        CompiledPredicate predicate = CompiledPredicate(
            challengeStateUpdate.stateObject.predicateAddress
        );
        require(
            predicate.decide(challengeStateUpdate.stateObject.inputs, _witness),
            "State object decided to false"
        );
    }
}
