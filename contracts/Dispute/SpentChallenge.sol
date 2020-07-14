pragma solidity ^0.5.0;
pragma experimental ABIEncoderV2;

contract SpentChallengeValidator {
    /**
     * _inputs: [encode(stateUpdate)]
     * _challengeInputs: [encode(transaction)]
     * _witness: [signature]
     */
    function validateChallenge(
        bytes[] calldata _inputs,
        bytes[] calldata _witness
    ) external {
        // TODO
        // TransactionがStateUpdateを更新するようなTransactionであることの確認
        // range, depositContractAddressのcheck
  // isValidStateTransactionPredocate.dicedeを参考に

        // signatureのcheck
          //IsValidSignaturePredicate.disideを参考に

    }
}