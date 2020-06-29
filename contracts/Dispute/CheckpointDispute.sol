pragma solidity ^0.5.0;
pragma experimental ABIEncoderV2;

import {DataTypes as types} from "../DataTypes.sol";
import {Dispute} from "./DisputeInterface.sol";
import {DisputeManager} from "./DisputeManager.sol";
import {CommitmentVerifier} from "../CommitmentVerifier.sol";
import {Utils} from "../Utils.sol";
import "../Library/Deserializer.sol";

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
    DisputeManager disputeManager;
    CommitmentVerifier commitmentVerifier;
    Utils utils;
    bytes CHECKPOINT_CLAIM = bytes("CHECKPOINT_CLAIM");
    bytes CHECKPOINT_CHALLENGE = bytes("CHECKPOINT_CHALLENGE");

    event CheckpointClaimed(
        types.StateUpdate stateUpdate,
        types.InclusionProof inclusionProof
    );

    constructor(
        address _disputeManagerAddress,
        address _commitmentContractAddress,
        address _utilsAddress
    ) public {
        disputeManager = DisputeManager(_disputeManagerAddress);
        commitmentVerifier = CommitmentVerifier(_commitmentContractAddress);
        utils = Utils(_utilsAddress);
    }

    /**
     * claim checkpoint
     * _propertyInputs: [encode(stateUpdate)]
     * _witness: [encode(inclusionProof)]
     * NOTE: might be possible to define concrete argument type but bytes[]
     */
    function claim(bytes[] memory _inputs, bytes[] memory _witness) public {
        // validate inputs
        require(
            _inputs.length == 1,
            "inputs length does not match. expected 1"
        );
        require(
            _witness.length == 1,
            "witness length does not match. expected 1"
        );
        types.Property memory suProperty = abi.decode(
            _inputs[0],
            (types.Property)
        );
        types.StateUpdate memory stateUpdate = Deserializer
            .deserializeStateUpdate(suProperty);
        types.InclusionProof memory inclusionProof = abi.decode(
            _witness[0],
            (types.InclusionProof)
        );

        // verify inclusion proof
        bytes memory blockNumberBytes = abi.encode(stateUpdate.blockNumber);
        bytes32 root = utils.bytesToBytes32(
            commitmentVerifier.retrieve(blockNumberBytes)
        );
        require(
            commitmentVerifier.verifyInclusionWithRoot(
                keccak256(abi.encode(stateUpdate.stateObject)),
                stateUpdate.depositContractAddress,
                stateUpdate.range,
                inclusionProof,
                root
            ),
            "Inclusion verification failed"
        );

        // claim property to DisputeManager
        bytes[] memory inputs = new bytes[](3);
        inputs[0] = CHECKPOINT_CLAIM;
        inputs[1] = _inputs[0];
        inputs[2] = _witness[0];

        types.Property memory property = types.Property(address(this), inputs);
        disputeManager.claim(property);

        emit CheckpointClaimed(stateUpdate, inclusionProof);
    }

    function challenge(
        bytes[] memory _inputs,
        bytes[] memory _challengeInputs,
        bytes[] memory _witness
    ) public {
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
        bytes[] memory _inputs,
        bytes[] memory _challengeInputs,
        bytes[] memory _witness
    ) public {
        // TODO: check property inputs
        // TODO: check challenge inputs
        // TODO: create challenge property of challenge
        // TODO: decideWithWitness
        // TODO: DisputeManager.decideToFalse(challengeProperty)
        // TODO: DisputeManager.removeChallenge(property, challengeProperty.id)
    }

    function settle(bytes[] memory _inputs) public {}
}
