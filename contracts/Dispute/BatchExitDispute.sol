pragma solidity ^0.5.0;
pragma experimental ABIEncoderV2;

import {DataTypes as types} from "../DataTypes.sol";
import {DepositContract} from "../DepositContract.sol";
import {DisputeHelper} from "./DisputeHelper.sol";
import {CheckpointChallengeValidator} from "./CheckpointChallengeValidator.sol";
import {SpentChallengeValidator} from "./SpentChallengeValidator.sol";
import {CompiledPredicate} from "../Predicate/CompiledPredicate.sol";
import {DisputeKind} from "./DisputeKind.sol";
import {Utils} from "../Utils.sol";

/**
 * BatchExitDispute
 */
contract BatchExitDispute is
    SpentChallengeValidator,
    CheckpointChallengeValidator
{
    Utils utils;

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
    {
        utils = Utils(_utilsAddress);
    }

    event BatchExitClaimed(bytes32 id, types.StateUpdate[] exitStateUpdates);

    event ExitSpentChallenged(types.StateUpdate stateUpdate);

    event ExitCheckpointChallenged(
        types.StateUpdate stateUpdate,
        types.StateUpdate challengingStateUpdate
    );

    event ExitChallengeRemoved(
        types.StateUpdate stateUpdate,
        types.StateUpdate challengingStateUpdate
    );

    event BatchExitSettled(types.StateUpdate[] exitStateUpdates, bool decision);

    /**
     * Claim Exit at StateUpdate
     * There're two kind of exit claims. ExitStateUpdate and ExitCheckpoint.
     * The former needs inclusion proof of stateUpdate. The latter don't need
     * witness but check if checkpoint for the stateUpdate is finalized yet.
     * _inputs: [encode(stateUpdate), checkpoint]
     * _witness: [encode(inclusionProof)]
     */
    function claim(bytes[] memory _inputs, bytes[] memory _witness) public {
        types.StateUpdate[] memory exitStateUpdates = new types.StateUpdate[](
            _inputs.length
        );
        for (uint256 i = 0; i < exitStateUpdates.length; i++) {
            types.ExitInput memory exitInput = abi.decode(
                _inputs[i],
                (types.ExitInput)
            );
            exitStateUpdates[i] = exitInput.stateUpdate;
            if (exitInput.isCheckpoint == 1) {
                types.StateUpdate memory checkpoint = types.StateUpdate({
                    depositContractAddress: exitInput
                        .stateUpdate
                        .depositContractAddress,
                    range: exitInput.range,
                    blockNumber: exitInput.stateUpdate.blockNumber,
                    stateObject: exitInput.stateUpdate.stateObject,
                    chunkId: exitInput.stateUpdate.chunkId
                });
                require(
                    checkpointExitable(exitInput.stateUpdate, checkpoint),
                    "Checkpoint must be exitable for stateUpdate"
                );
            } else {
                types.InclusionProof memory inclusionProof = abi.decode(
                    _witness[i],
                    (types.InclusionProof)
                );
                bytes memory blockNumberBytes = abi.encode(
                    exitInput.stateUpdate.blockNumber
                );
                bytes32 root = utils.bytesToBytes32(
                    commitmentVerifier.retrieve(blockNumberBytes)
                );

                require(
                    commitmentVerifier.verifyInclusionWithRoot(
                        keccak256(
                            abi.encode(exitInput.stateUpdate.stateObject)
                        ),
                        exitInput.stateUpdate.depositContractAddress,
                        exitInput.stateUpdate.range,
                        inclusionProof,
                        root
                    ),
                    "Inclusion verification failed"
                );
            }
        }
        // claim property to DisputeManager
        types.Property memory property = createProperty(
            abi.encode(exitStateUpdates),
            BATCH_EXIT_CLAIM
        );
        disputeManager.claim(property);
        bytes32 id = utils.getPropertyId(property);
        emit BatchExitClaimed(id, exitStateUpdates);
    }

    /**
     * challenge prove the exiting coin has been spent.
     * First element of challengeInputs must be either of
     * bytes("BATCH_EXIT_SPENT_CHALLENGE") or bytes("BATCH_EXIT_CHECKPOINT_CHALLENGE")
     * SPENT_CHALLENGE
     * input: [SU]
     * challengeInput: [label, transaction]
     * witness: [signature]
     * CHECKPOINT
     * input: [SU]
     * challengeInput: [label, checkpointSU]
     * witness: []
     */
    function challenge(
        bytes[] memory _inputs,
        bytes[] memory _challengeInputs,
        bytes[] memory _witness
    ) public {
        require(
            _witness.length == 1,
            "witness length does not match. expected 1"
        );
        require(
            _challengeInputs.length == 3,
            "challenge inputs length does not match. expected 2"
        );
        types.StateUpdate[] memory exitStateUpdates = new types.StateUpdate[](
            _inputs.length
        );
        for (uint256 i = 0; i < exitStateUpdates.length; i++) {
            types.ExitInput memory exitInput = abi.decode(
                _inputs[i],
                (types.ExitInput)
            );
            exitStateUpdates[i] = exitInput.stateUpdate;
        }
        types.Property memory challengeProperty;
        uint256 index = abi.decode(_challengeInputs[1], (uint256));
        types.StateUpdate memory stateUpdate = exitStateUpdates[index];
        if (
            keccak256(_challengeInputs[0]) ==
            keccak256(BATCH_EXIT_SPENT_CHALLENGE)
        ) {
            types.Transaction memory transaction = abi.decode(
                _challengeInputs[2],
                (types.Transaction)
            );
            validateSpentChallenge(stateUpdate, transaction, _witness);
            challengeProperty = createProperty(
                _challengeInputs[0],
                BATCH_EXIT_SPENT_CHALLENGE
            );
            emit ExitSpentChallenged(stateUpdate);
        } else if (
            keccak256(_challengeInputs[0]) ==
            keccak256(BATCH_EXIT_CHECKPOINT_CHALLENGE)
        ) {
            types.StateUpdate memory challengeStateUpdate = abi.decode(
                _challengeInputs[2],
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
            challengeProperty = createProperty(
                _challengeInputs[2],
                BATCH_EXIT_CHECKPOINT_CHALLENGE
            );
            emit ExitCheckpointChallenged(stateUpdate, challengeStateUpdate);
        } else {
            revert("illegal challenge type");
        }

        types.Property memory claimedProperty = createProperty(
            abi.encode(exitStateUpdates),
            BATCH_EXIT_CLAIM
        );
        require(
            disputeManager.started(utils.getPropertyId(claimedProperty)),
            "Claim does not exist"
        );

        disputeManager.challenge(claimedProperty, challengeProperty);
    }

    function removeChallenge(
        bytes[] memory _inputs,
        bytes[] memory _challengeInputs,
        bytes[] memory _witness
    ) public {
        // removeChallenge for checkpoint challenge.
    }

    /**
     * prove exit is coin which hasn't been spent.
     * check checkpoint
     */
    function settle(bytes[] memory _inputs) public {
        types.StateUpdate[] memory exitStateUpdates = new types.StateUpdate[](
            _inputs.length
        );
        for (uint256 i = 0; i < exitStateUpdates.length; i++) {
            types.ExitInput memory exitInput = abi.decode(
                _inputs[i],
                (types.ExitInput)
            );
            exitStateUpdates[i] = exitInput.stateUpdate;
        }

        types.Property memory property = createProperty(
            abi.encode(exitStateUpdates),
            BATCH_EXIT_CLAIM
        );
        bool decision = disputeManager.settleGame(property);
        require(decision, "game must be settled");

        emit BatchExitSettled(exitStateUpdates, true);
    }

    /* Helpers */
    function getId(types.StateUpdate memory _su)
        private
        pure
        returns (bytes32)
    {
        return keccak256(abi.encode(_su));
    }

    function getClaimDecision(types.StateUpdate[] memory _stateUpdates)
        public
        view
        returns (types.Decision)
    {
        types.Property memory exitProperty = createProperty(
            abi.encode(_stateUpdates),
            BATCH_EXIT_CLAIM
        );
        bytes32 id = utils.getPropertyId(exitProperty);
        types.ChallengeGame memory game = disputeManager.getGame(id);
        return game.decision;
    }

    /**
     * If the exit can be withdrawable, isCompletable returns true.
     */
    function isCompletable(bytes32 id) public view returns (bool) {
        return disputeManager.isDecidable(id);
    }

    function checkpointExitable(
        types.StateUpdate memory stateUpdate,
        types.StateUpdate memory checkpoint
    ) private returns (bool) {
        require(
            isSubrange(stateUpdate.range, checkpoint.range),
            "StateUpdate range must be subrange of checkpoint"
        );
        require(
            stateUpdate.blockNumber == checkpoint.blockNumber,
            "BlockNumber must be same"
        );

        bytes32 id = getId(checkpoint);
        DepositContract depositContract = DepositContract(
            stateUpdate.depositContractAddress
        );
        require(
            depositContract.checkpoints(id),
            "Checkpoint needs to be finalized or inclusionProof have to be provided"
        );

        return true;
    }

    function isSubrange(
        types.Range memory _subrange,
        types.Range memory _surroundingRange
    ) public pure returns (bool) {
        return
            _subrange.start >= _surroundingRange.start &&
            _subrange.end <= _surroundingRange.end;
    }
}
