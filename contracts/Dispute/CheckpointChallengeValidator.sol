pragma solidity ^0.5.0;
pragma experimental ABIEncoderV2;

/**
 * Called from DisputeContracts' `challenge` method and `removeChallenge` method.
 */
contract CheckpointChallengeValidator  {
    /**
     * challenge checkpiont
     * _inputs: [encode(stateUpdate)] challenged state update
     * _challengeInputs: [encode(stateUpdate)] challenging state update
     * _witness: [encode(inclusionProof)] inclusionProof of challenging state update
     */
    function validateChallenge(
        bytes[] calldata _inputs,
        bytes[] calldata _challengeInputs,
        bytes[] calldata _witness
    ) external {
        // TODO
    }

    function validateChallengeRemoval() external {}
}