pragma solidity ^0.5.0;
pragma experimental ABIEncoderV2;

import {DataTypes as types} from "../DataTypes.sol";
import {DisputeHelper} from "./DisputeHelper.sol";
import {DisputeKind} from "./DisputeKind.sol";
import {CompiledPredicate} from "../Predicate/CompiledPredicate.sol";
import {DisputeManager} from "./DisputeManager.sol";
import {CommitmentVerifier} from "../CommitmentVerifier.sol";
import {Utils} from "../Utils.sol";

/**
 * Called from DisputeContracts' `challenge` method and `removeChallenge` method.
 */
contract CheckpointChallengeValidator is DisputeHelper, DisputeKind {
    constructor(
        address _disputeManagerAddress,
        address _commitmentVerifierAddress,
        address _utilsAddress
    )
        public
        DisputeHelper(
            _disputeManagerAddress,
            _commitmentVerifierAddress,
            _utilsAddress
        )
    {}

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
    )
        internal
        view
        returns (
            types.StateUpdate memory,
            types.StateUpdate memory,
            types.InclusionProof memory
        )
    {
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
            utils.isSubrange(challengeStateUpdate.range, stateUpdate.range),
            "Range must be subrange of stateUpdate"
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
    )
        internal
        view
        returns (
            types.Property memory,
            types.Property memory,
            types.StateUpdate memory,
            types.StateUpdate memory
        )
    {
        types.StateUpdate memory stateUpdate = abi.decode(
            _inputs[0],
            (types.StateUpdate)
        );

        types.Property memory property = createProperty(
            _inputs[0],
            CHECKPOINT_CLAIM
        );

        types.StateUpdate memory challengeStateUpdate = abi.decode(
            _challengeInputs[0],
            (types.StateUpdate)
        );

        types.Property memory challengeProperty = createProperty(
            _challengeInputs[0],
            CHECKPOINT_CHALLENGE
        );

        require(
            disputeManager.isChallengeOf(property, challengeProperty),
            "Invalid challenge"
        );

        types.Transaction memory transaction = abi.decode(
            _witness[0],
            (types.Transaction)
        );
        require(
            transaction.depositContractAddress ==
                stateUpdate.depositContractAddress,
            "token must be same"
        );
        require(
            utils.hasIntersection(stateUpdate.range, transaction.range),
            "range must contain subrange"
        );
        require(
            transaction.maxBlockNumber >= stateUpdate.blockNumber,
            "blockNumber must be valid"
        );

        CompiledPredicate predicate = CompiledPredicate(
            challengeStateUpdate.stateObject.predicateAddress
        );

        types.Property memory so = challengeStateUpdate.stateObject;

        // inputs for stateObject property
        bytes[] memory inputs = new bytes[](so.inputs.length + 1);
        for (uint256 i = 0; i < so.inputs.length; i++) {
            inputs[i] = so.inputs[i];
        }
        inputs[so.inputs.length] = _witness[0];

        bytes[] memory witness = new bytes[](_witness.length - 1);
        for (uint256 i = 0; i < _witness.length - 1; i++) {
            witness[i] = _witness[i + 1];
        }

        require(
            predicate.decide(inputs, witness),
            "State object decided to false"
        );
        return (challengeProperty, property, stateUpdate, challengeStateUpdate);
    }
}
