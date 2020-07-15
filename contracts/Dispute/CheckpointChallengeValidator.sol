pragma solidity ^0.5.0;
pragma experimental ABIEncoderV2;

import {DataTypes as types} from "../DataTypes.sol";
import "../Library/Deserializer.sol";
import {DisputeHelper} from "./DisputeHelper.sol";
import {DisputeKind} from "./DisputeKind.sol";
import {CompiledPredicate} from "../Predicate/CompiledPredicate.sol";

/**
 * Called from DisputeContracts' `challenge` method and `removeChallenge` method.
 */
contract CheckpointChallengeValidator is DisputeHelper, DisputeKind {
    /**
     * challenge checkpiont
     * _inputs: [encode(stateUpdate)] challenged state update
     * _challengeInputs: [encode(stateUpdate)] challenging state update
     * _witness: [encode(inclusionProof)] inclusionProof of challenging state update
     */
    function validateCheckpointChallenge(
        bytes[] memory _inputs,
        bytes[] memory _challengeInputs,
        bytes[] memory _witness
    ) internal view returns (types.StateUpdate memory, types.StateUpdate memory, types.InclusionProof memory){
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

        types.Property memory claimedProperty = createProperty(_inputs[0], CHECKPOINT_CLAIM);
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
            isSubrange(challengeStateUpdate.range, stateUpdate.range),
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
        return (stateUpdate, challengeStateUpdate, inclusionProof);
    }

    function validateChallengeRemoval(
                bytes[] memory _inputs,
                bytes[] memory _challengeInputs,
                bytes[] memory _witness
        ) internal view returns (types.Property memory, types.Property memory, types.StateUpdate memory, types.StateUpdate memory) {
        types.Property memory suProperty = abi.decode(
            _inputs[0],
            (types.Property)
        );
        types.StateUpdate memory stateUpdate = Deserializer
            .deserializeStateUpdate(suProperty);

        types.Property memory property = createProperty(_inputs[0], CHECKPOINT_CLAIM);

        types.Property memory challengeSuProperty = abi.decode(
            _challengeInputs[0],
            (types.Property)
        );
        types.StateUpdate memory challengeStateUpdate = Deserializer
            .deserializeStateUpdate(challengeSuProperty);

        types.Property memory challengeProperty = createProperty(
            _challengeInputs[0],
            CHECKPOINT_CHALLENGE
        );

        require(
            disputeManager.isChallengeOf(property, challengeProperty),
            "Invalid challenge"
        );

        // TODO: need to use stateUpdate predicate instead of stateObject to check validity of transaction?
        CompiledPredicate predicate = CompiledPredicate(
            challengeStateUpdate.stateObject.predicateAddress
        );

        require(
            predicate.decide(challengeStateUpdate.stateObject.inputs, _witness),
            "State object decided to false"
        );
        return (challengeProperty, property, stateUpdate, challengeStateUpdate);
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