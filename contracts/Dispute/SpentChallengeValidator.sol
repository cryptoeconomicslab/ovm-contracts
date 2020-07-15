pragma solidity ^0.5.0;
pragma experimental ABIEncoderV2;

import {DataTypes as types} from "../DataTypes.sol";
import {Utils} from "../Utils.sol";
import "../Library/ECRecover.sol";

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
        types.Property memory previousStateUpdate = abi.decode(
            _inputs[0],
            (types.Property)
        );
        types.Property memory transaction = abi.decode(
            _challengeInputs[0],
            (types.Property)
        );
        require(
            keccak256(transaction.inputs[0]) ==
                keccak256(previousStateUpdate.inputs[0]),
            "token must be same"
        );
        // 下記の_inputs[0]、_inputs[1]に何を指定すればいいのかわからない
        types.Range memory range = utils.bytesToRange(_inputs[0]);
        types.Range memory subrange = utils.bytesToRange(_inputs[1]);
        require(
            range.start <= subrange.start && subrange.end <= range.end,
            "range must contain subrange"
        );

        // signatureのcheck
        // IsValidSignaturePredicate.disideを参考に

        // 下記の第２引数、第3引数に何を指定すればいいのかわからない
        bytes32 hashedMessage = keccak256(_witness[0]);
        require(
            ECRecover.ecverify(
                hashedMessage,
                _inputs[1],
                utils.bytesToAddress(_inputs[2])
            ),
            "_inputs[1] must be signature of _inputs[0] by _inputs[2]"
        );
    }
}