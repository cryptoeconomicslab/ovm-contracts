pragma solidity ^0.5.0;
pragma experimental ABIEncoderV2;

import {DataTypes as types} from "../DataTypes.sol";

/**
 * Dispute contract interface
 * Fraud proof based dispute game using DisputeManager contract should implmenet this interface.
 * To make things simple, dispute contract only implement three methods `claim`, `challenge` and `removeChallenge`.
 */
interface Dispute {
    /**
     * claim a statement.
     */
    function claim(bytes[] calldata _inputs, bytes[] calldata _witness)
        external;

    /**
     * challenge to a claimed statement.
     */
    function challenge(
        bytes[] calldata _inputs,
        bytes[] calldata _challengeInputs,
        bytes[] calldata _witness
    ) external;

    /**
     * remove challenge of a claimed statement by invalidating the challenge.
     */
    function removeChallenge(
        bytes[] calldata _inputs,
        bytes[] calldata _challengeInputs,
        bytes[] calldata _witness
    ) external;

    /**
     * settle checkpoint claim
     */
    function settle(bytes[] calldata _inputs) external;
}
