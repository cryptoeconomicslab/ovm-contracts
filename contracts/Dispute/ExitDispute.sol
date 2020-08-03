pragma solidity ^0.5.0;
pragma experimental ABIEncoderV2;

import {DataTypes as types} from "../DataTypes.sol";
import {DepositContract} from "../DepositContract.sol";
import {Dispute} from "./DisputeInterface.sol";
import {DisputeHelper} from "./DisputeHelper.sol";
import {CheckpointChallengeValidator} from "./CheckpointChallengeValidator.sol";
import {SpentChallengeValidator} from "./SpentChallengeValidator.sol";
import {CompiledPredicate} from "../Predicate/CompiledPredicate.sol";
import {DisputeKind} from "./DisputeKind.sol";
import {Utils} from "../Utils.sol";

/**
 * # ExitDispute contract
 * A settled Exit means a StateUpdate is withdrawable.
 * Withdrawal exit is coin which hasn't been spent.
 * Exitable stateUpdate is StateUpdate which is not spended
 * and StateUpdate at which checkpoint decides.
 */
contract ExitDispute is
    Dispute,
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

    event ExitClaimed(types.StateUpdate stateUpdate);

    event ExitSpentChallenged(types.StateUpdate stateUpdate);

    event ExitCheckpointChallenged(
        types.StateUpdate stateUpdate,
        types.StateUpdate challengingStateUpdate
    );

    event ExitChallengeRemoved(
        types.StateUpdate stateUpdate,
        types.StateUpdate challengingStateUpdate
    );

    event ExitSettled(types.StateUpdate stateUpdate, bool decision);

    /**
     * Claim Exit at StateUpdate
     * There're two kind of exit claims. ExitStateUpdate and ExitCheckpoint.
     * The former needs inclusion proof of stateUpdate. The latter don't need
     * witness but check if checkpoint for the stateUpdate is finalized yet.
     * _inputs: [encode(stateUpdate), checkpointId?]
     * _witness: [encode(inclusionProof)]
     */
    function claim(bytes[] memory _inputs, bytes[] memory _witness) public {
        // validate inputs
        require(
            _inputs.length >= 1,
            "inputs length does not match. at least 1"
        );
        types.StateUpdate memory stateUpdate = abi.decode(
            _inputs[0],
            (types.StateUpdate)
        );

        if (_witness.length == 0) {
            // ExitCheckpoint
            // check if checkpoint is stored in depositContract
            types.StateUpdate memory checkpoint = abi.decode(
                _inputs[1],
                (types.StateUpdate)
            );
            require(
                checkpointExitable(stateUpdate, checkpoint),
                "Checkpoint must be exitable for stateUpdate"
            );
        } else {
            // ExitStateUpdate
            types.InclusionProof memory inclusionProof = abi.decode(
                _witness[0],
                (types.InclusionProof)
            );
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
        }
        // claim property to DisputeManager
        types.Property memory property = createProperty(_inputs[0], EXIT_CLAIM);
        disputeManager.claim(property);

        emit ExitClaimed(stateUpdate);
    }

    /**
     * challenge prove the exiting coin has been spent.
     * First element of challengeInputs must be either of
     * bytes("EXIT_SPENT_CHALLENGE") or bytes("EXIT_CHECKPOINT_CHALLENGE")
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
            _witness.length == 1,
            "witness length does not match. expected 1"
        );
        require(
            _challengeInputs.length == 2,
            "challenge inputs length does not match. expected 2"
        );
        types.Property memory challengeProperty;
        types.StateUpdate memory stateUpdate = abi.decode(
            _inputs[0],
            (types.StateUpdate)
        );
        if (keccak256(_challengeInputs[0]) == keccak256(EXIT_SPENT_CHALLENTE)) {
            bytes[] memory spentChallengeInputs = new bytes[](1);
            spentChallengeInputs[0] = _challengeInputs[1];
            validateSpentChallenge(_inputs, spentChallengeInputs, _witness);
            challengeProperty = createProperty(
                _challengeInputs[0],
                EXIT_SPENT_CHALLENTE
            );
            emit ExitSpentChallenged(stateUpdate);
        } else if (
            keccak256(_challengeInputs[0]) ==
            keccak256(EXIT_CHECKPOINT_CHALLENTE)
        ) {
            validateCheckpointChallenge(_inputs, _challengeInputs, _witness);
            challengeProperty = createProperty(
                _challengeInputs[0],
                _challengeInputs[1]
            );
            types.StateUpdate memory challengeStateUpdate = abi.decode(
                _challengeInputs[0],
                (types.StateUpdate)
            );
            emit ExitCheckpointChallenged(stateUpdate, challengeStateUpdate);
        } else {
            revert("illegal challenge type");
        }

        disputeManager.challenge(
            createProperty(_inputs[0], EXIT_CLAIM),
            challengeProperty
        );
    }

    function removeChallenge(
        bytes[] memory _inputs,
        bytes[] memory _challengeInputs,
        bytes[] memory _witness
    ) public {}

    /**
     * prove exit is coin which hasn't been spent.
     * check checkpoint
     */
    function settle(bytes[] memory _inputs) public {
        require(
            _inputs.length == 1,
            "inputs length does not match. expected 1"
        );

        types.Property memory property = createProperty(_inputs[0], EXIT_CLAIM);
        bool decision = disputeManager.settleGame(property);

        types.StateUpdate memory stateUpdate = abi.decode(
            _inputs[0],
            (types.StateUpdate)
        );

        emit ExitSettled(stateUpdate, true);
    }

    /* Helpers */
    function getId(types.StateUpdate memory _su)
        private
        pure
        returns (bytes32)
    {
        return keccak256(abi.encode(_su));
    }

    function getClaimDecision(types.StateUpdate memory _su)
        public
        view
        returns (types.Decision)
    {
        bytes memory suBytes = abi.encode(_su);
        types.Property memory exitProperty = createProperty(
            suBytes,
            EXIT_CLAIM
        );
        bytes32 id = utils.getPropertyId(exitProperty);
        types.ChallengeGame memory game = disputeManager.getGame(id);
        return game.decision;
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
