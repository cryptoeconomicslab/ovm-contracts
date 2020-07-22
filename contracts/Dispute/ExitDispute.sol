pragma solidity ^0.5.0;
pragma experimental ABIEncoderV2;
 
import {DataTypes as types} from "../DataTypes.sol";
import {Dispute} from './DisputeInterface.sol';
import {DisputeHelper} from "./DisputeHelper.sol";
import {CheckpointChallengeValidator} from './CheckpointChallengeValidator.sol';
import {SpentChallengeValidator} from './SpentChallengeValidator.sol';
import "../Library/Deserializer.sol";
import {CompiledPredicate} from "../Predicate/CompiledPredicate.sol";
import {DisputeKind} from "./DisputeKind.sol";

/**
 * # ExitDispute contract
 * A settled Exit means a StateUpdate is withdrawable.
 * Withdrawal exit is coin which hasn't been spent.
 * Exitable stateUpdate is StateUpdate which is not spended
 * and StateUpdate at which checkpoint decides.
 */
contract ExitDispute is Dispute, CheckpointChallengeValidator {
    constructor(
        address _disputeManagerAddress,
        address _commitmentVerifierAddress,
        address _utilsAddress
    ) public CheckpointChallengeValidator(_disputeManagerAddress, _commitmentVerifierAddress, _utilsAddress) {}

    event ExitClaimed(
        types.StateUpdate stateUpdate
    );

    event ExitChallenged(
        types.StateUpdate stateUpdate,
        bytes challengeType
    );

    event ExitSettled(types.StateUpdate);

    function claim(bytes[] calldata _inputs, bytes[] calldata _witness)
        external{
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
        bytes[] calldata _inputs,
        bytes[] calldata _challengeInputs,
        bytes[] calldata _witness
    ) external{
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
        if (keccak256(_challengeInputs[0]) == keccak256(EXIT_SPENT_CHALLENTE)) {
            bytes[] memory spentChallengeInputs = new bytes[](1);
            spentChallengeInputs[0] = _challengeInputs[1];
            new SpentChallengeValidator().validateSpentChallenge(_inputs, spentChallengeInputs, _witness);
            challengeProperty = createProperty(_challengeInputs[0], EXIT_SPENT_CHALLENTE);
        } else if (keccak256(_challengeInputs[0]) == keccak256(EXIT_CHECKPOINT_CHALLENTE)) {
            validateCheckpointChallenge(_inputs, _challengeInputs, _witness);
            challengeProperty = createProperty(_challengeInputs[0], _challengeInputs[1]);
        } else {
            revert("illegal challenge type");
        }
        disputeManager.challenge(createProperty(_inputs[0], EXIT_CLAIM), challengeProperty);
        types.Property memory suProperty = abi.decode(
            _inputs[0],
            (types.Property)
        );
        types.StateUpdate memory stateUpdate = Deserializer
            .deserializeStateUpdate(suProperty);
        emit ExitChallenged(
            stateUpdate, _challengeInputs[0]
        );
    }

    function removeChallenge(
        bytes[] calldata _inputs,
        bytes[] calldata _challengeInputs,
        bytes[] calldata _witness
    ) external{}

    /**
     * prove exit is coin which hasn't been spent.
     * check checkpoint
     */
    function settle(bytes[] calldata _inputs) external{
        require(
            _inputs.length == 1,
            "inputs length does not match. expected 1"
        );
        types.Property memory property = createProperty(_inputs[0], EXIT_CLAIM);
        disputeManager.settleGame(property);

        types.Property memory suProperty = abi.decode(
            _inputs[0],
            (types.Property)
        );
        types.StateUpdate memory stateUpdate = Deserializer
            .deserializeStateUpdate(suProperty);

        emit ExitSettled(stateUpdate);
    }
}
