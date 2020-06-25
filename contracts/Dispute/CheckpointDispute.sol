pragma solidity ^0.5.0;
pragma experimental ABIEncoderV2;

import {DataTypes as types} from "../DataTypes.sol";
import {Dispute} from "./DisputeInterface.sol";

/**
 * # CheckpointDispute contract
 * establishment of checkpoint means that specified stateUpdate has been included in a
 * block and up to the stateUpdate, all the past stateUpdate in the same range have been properly transitioned.
 * A checkpoint can be challenged by specifying a stateUpdate that has not been transitioned properly.
 * Challenge can be removed when witness is submitted which proves the proper transition of the stateUpdate.
 *
 * ## Claim
 * ### parameter
 * - stateUpdate : stateUpdate until which state transitioned are properly executed
 * ### witness
 * - inclusion proof : inclusion proof of specified state update
 *
 * ## Challenge
 * ### parameter
 * - stateUpdate : stateUpdate whose state transition has not been properly executed
 * ### witness
 * - inclusionProof : inclusion proof of challenging stateUpdate
 *
 * ## Remove challenge
 * ### witness
 * - witness : array of bytes passed to state object of specified stateUpdate
 * ex) ownership : [[owner, tx], [signature]]
 */
contract CheckpointDispute is Dispute {
    function claim(bytes[] calldata _propertyInputs, bytes[] calldata _witness)
        external
    {
        // TODO: check property inputs
        // TODO: verify inclusion proof
        // TODO: DisputeManager.claim(property)
    }

    function challenge(
        bytes[] calldata _propertyInputs,
        bytes[] calldata _challengeInputs,
        bytes[] calldata _witness
    ) external {
        // TODO: check property inputs
        // check challenge inputs
        // TODO: check stateUpdate blockNumber, range, depositContractAddress = equal to quantifier SU
        // TODO: verify inclusion proof = equal to quantifier IncludedAt
        // TODO: DisputeManager.claim(challengeProperty)
        // TODO: DisputeManager.challenge()
        // if challenge property is immediately decidable property (ex. Exit),
        // DisputeManager.decideToTrue(challengeProperty)
        // DisputeManager.decideToFalse(challengedProperty)
    }

    function removeChallenge(
        bytes[] calldata _propertyInputs,
        bytes[] calldata _challengeInputs,
        bytes[] calldata _witness
    ) external {
        // TODO: check property inputs
        // TODO: check challenge inputs
        // TODO: create challenge property of challenge
        // TODO: decideWithWitness
        // TODO: DisputeManager.decideToFalse(challengeProperty)
        // TODO: DisputeManager.removeChallenge(property, challengeProperty.id)
    }
}
