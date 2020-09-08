pragma solidity ^0.5.0;
pragma experimental ABIEncoderV2;

import {DataTypes as types} from "../DataTypes.sol";
import {DepositContract} from "../DepositContract.sol";
import {DisputeHelper} from "./DisputeHelper.sol";
import {CompiledPredicate} from "../Predicate/CompiledPredicate.sol";
import {DisputeKind} from "./DisputeKind.sol";
import {CheckpointChallengeValidator} from "./CheckpointChallengeValidator.sol";

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
contract CheckpointDispute is CheckpointChallengeValidator {
    event CheckpointClaimed(
        types.StateUpdate stateUpdate,
        types.InclusionProof inclusionProof
    );

    event CheckpointChallenged(
        types.StateUpdate stateUpdate,
        types.StateUpdate challengingStateUpdate,
        types.InclusionProof inclusionProof
    );

    event ChallengeRemoved(
        types.StateUpdate stateUpdate,
        types.StateUpdate challengingStateUpdate
    );

    event CheckpointSettled(types.StateUpdate);

    constructor(
        address _disputeManagerAddress,
        address _commitmentVerifierAddress,
        address _utilsAddress
    )
        public
        CheckpointChallengeValidator(
            _disputeManagerAddress,
            _commitmentVerifierAddress,
            _utilsAddress
        )
    {}

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
        types.StateUpdate memory stateUpdate = abi.decode(
            _inputs[0],
            (types.StateUpdate)
        );
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
        types.Property memory property = createProperty(
            _inputs[0],
            CHECKPOINT_CLAIM
        );
        disputeManager.claim(property);

        emit CheckpointClaimed(stateUpdate, inclusionProof);
    }

    /**
     * challenge checkpiont
     * _inputs: [encode(stateUpdate)] challenged state update
     * _challengeInputs: [encode(stateUpdate)] challenging state update
     * _witness: [encode(inclusionProof)] inclusionProof of challenging state update
     */
    function challenge(
        bytes[] memory _inputs,
        bytes[] memory _challengeInputs,
        bytes[] memory _witness
    ) public {
        require(
            _inputs.length == 1,
            "inputs length does not match. expected 1"
        );
        require(
            _challengeInputs.length == 1,
            "challenge inputs length does not match. expected 1"
        );
        require(
            _witness.length == 1,
            "witness length does not match. expected 1"
        );
        types.StateUpdate memory stateUpdate = abi.decode(
            _inputs[0],
            (types.StateUpdate)
        );
        types.StateUpdate memory challengeStateUpdate = abi.decode(
            _challengeInputs[0],
            (types.StateUpdate)
        );
        types.InclusionProof memory inclusionProof = abi.decode(
            _witness[0],
            (types.InclusionProof)
        );

        validateCheckpointChallenge(
            stateUpdate,
            challengeStateUpdate,
            inclusionProof
        );

        types.Property memory claimProperty = createProperty(
            _inputs[0],
            CHECKPOINT_CLAIM
        );
        types.Property memory challengeProperty = createProperty(
            _challengeInputs[0],
            CHECKPOINT_CHALLENGE
        );
        require(
            disputeManager.started(utils.getPropertyId(claimProperty)),
            "Claim does not exist"
        );
        disputeManager.challenge(claimProperty, challengeProperty);

        emit CheckpointChallenged(
            stateUpdate,
            challengeStateUpdate,
            inclusionProof
        );
    }

    /**
     * challenge checkpiont
     * _inputs: [encode(stateUpdate)] challenged state update
     * _challengeInputs: [encode(stateUpdate)] challenging state update
     * _witness: [*] witness to decide challenging state object to true
     */
    function removeChallenge(
        bytes[] memory _inputs,
        bytes[] memory _challengeInputs,
        bytes[] memory _witness
    ) public {
        require(
            _inputs.length == 1,
            "inputs length does not match. expected 1"
        );
        require(
            _challengeInputs.length == 1,
            "challenge inputs length does not match. expected 1"
        );
        require(_witness.length >= 1, "witness must be at least 1");

        (
            types.Property memory challengeProperty,
            types.Property memory property,
            types.StateUpdate memory stateUpdate,
            types.StateUpdate memory challengeStateUpdate
        ) = validateChallengeRemoval(_inputs, _challengeInputs, _witness);

        disputeManager.setGameResult(challengeProperty, false);
        disputeManager.removeChallenge(property, challengeProperty);

        emit ChallengeRemoved(stateUpdate, challengeStateUpdate);
    }

    /**
     * settle checkpoint claim
     */
    function settle(bytes[] memory _inputs) public {
        require(
            _inputs.length == 1,
            "inputs length does not match. expected 1"
        );
        types.Property memory property = createProperty(
            _inputs[0],
            CHECKPOINT_CLAIM
        );
        bool result = disputeManager.settleGame(property);

        types.StateUpdate memory stateUpdate = abi.decode(
            _inputs[0],
            (types.StateUpdate)
        );

        emit CheckpointSettled(stateUpdate);
        if (result) {
            DepositContract depositContract = DepositContract(
                stateUpdate.depositContractAddress
            );
            depositContract.finalizeCheckpoint(stateUpdate);
        }
    }
}
