pragma solidity ^0.5.0;
pragma experimental ABIEncoderV2;

import {DataTypes as types} from "../DataTypes.sol";
import {Dispute} from "./DisputeInterface.sol";
import {DisputeManager} from "./DisputeManager.sol";
import {CommitmentVerifier} from "../CommitmentVerifier.sol";
import {Utils} from "../Utils.sol";
import {CompiledPredicate} from "../Predicate/CompiledPredicate.sol";
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

    event CheckpointChallenged(
        types.StateUpdate stateUpdate,
        types.StateUpdate challengingStateUpdate,
        types.InclusionProof inclusionProof
    );

    event ChallengeRemoved(
        types.StateUpdate stateUpdate,
        types.StateUpdate challengingStateUpdate
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
        types.Property memory property = createClaimProperty(_inputs[0]);
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
        types.Property memory suProperty = abi.decode(
            _inputs[0],
            (types.Property)
        );
        types.StateUpdate memory stateUpdate = Deserializer
            .deserializeStateUpdate(suProperty);

        types.Property memory challengeSuProperty = abi.decode(
            _challengeInputs[0],
            (types.Property)
        );
        types.StateUpdate memory challengeStateUpdate = Deserializer
            .deserializeStateUpdate(challengeSuProperty);

        types.InclusionProof memory inclusionProof = abi.decode(
            _witness[0],
            (types.InclusionProof)
        );

        types.Property memory claimedProperty = createClaimProperty(_inputs[0]);
        require(
            stateUpdate.depositContractAddress ==
                challengeStateUpdate.depositContractAddress,
            "DepositContractAddress is invalid"
        );
        require(
            stateUpdate.blockNumber > challengeStateUpdate.blockNumber,
            "BlockNumber must be smaller than challenged state"
        );
        require(
            isSubrange(challengeStateUpdate.range, stateUpdate.range), // TODO: is this right?
            "Range must be subrange of stateUpdate"
        );
        require(
            disputeManager.started(utils.getPropertyId(claimedProperty)),
            "Claim does not exist"
        );

        // verify inclusion proof
        bytes memory blockNumberBytes = abi.encode(
            challengeStateUpdate.blockNumber
        );
        bytes32 root = utils.bytesToBytes32(
            commitmentVerifier.retrieve(blockNumberBytes)
        );
        require(
            commitmentVerifier.verifyInclusionWithRoot(
                keccak256(abi.encode(challengeStateUpdate.stateObject)),
                challengeStateUpdate.depositContractAddress,
                challengeStateUpdate.range,
                inclusionProof,
                root
            ),
            "Inclusion verification failed"
        );

        types.Property memory claimProperty = createClaimProperty(_inputs[0]);
        types.Property memory challengeProperty = createChallengeProperty(
            _challengeInputs[0]
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
        types.Property memory suProperty = abi.decode(
            _inputs[0],
            (types.Property)
        );
        types.StateUpdate memory stateUpdate = Deserializer
            .deserializeStateUpdate(suProperty);

        types.Property memory property = createClaimProperty(_inputs[0]);

        types.Property memory challengeSuProperty = abi.decode(
            _challengeInputs[0],
            (types.Property)
        );
        types.StateUpdate memory challengeStateUpdate = Deserializer
            .deserializeStateUpdate(challengeSuProperty);

        types.Property memory challengeProperty = createChallengeProperty(
            _challengeInputs[0]
        );

        require(
            disputeManager.isChallengeOf(property, challengeProperty),
            "Invalid challenge"
        );

        // TODO: is it okay to use CompiledPredicate interface here?
        CompiledPredicate predicate = CompiledPredicate(
            challengeStateUpdate.stateObject.predicateAddress
        );

        require(
            predicate.decide(challengeStateUpdate.stateObject.inputs, _witness),
            "State object decided to false"
        );

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
        types.Property memory property = createClaimProperty(_inputs[0]);
        disputeManager.settleGame(property);
    }

    // create checkpoint claim passed to dispute manager
    // TODO: do we need this in property?
    function createClaimProperty(bytes memory suBytes)
        private
        view
        returns (types.Property memory)
    {
        bytes[] memory inputs = new bytes[](2);
        inputs[0] = CHECKPOINT_CLAIM;
        inputs[1] = suBytes;
        return types.Property(address(this), inputs);
    }

    function createChallengeProperty(bytes memory challengeSuBytes)
        private
        view
        returns (types.Property memory)
    {
        bytes[] memory inputs = new bytes[](2);
        inputs[0] = CHECKPOINT_CHALLENGE;
        inputs[1] = challengeSuBytes;
        return types.Property(address(this), inputs);

    }

    function isSubrange(
        types.Range memory _subrange,
        types.Range memory _surroundingRange
    ) private pure returns (bool) {
        return
            _subrange.start >= _surroundingRange.start &&
            _subrange.end <= _surroundingRange.end;
    }
}
