import {Dispute} from './DisputeInterface';
import {DisputeManager} from './DisputeManager';

/**
 * # ExitDispute contract
 * A settled Exit means a StateUpdate is withdrawable.
 * Withdrawal exit is coin which hasn't been spent.
 */
contract ExitDispute is  Dispute {
    DisputeManager disputeManager;

    bytes CHECKPOINT_CLAIM = bytes("CHECKPOINT_CLAIM");

    event ExitClaimed(
        types.StateUpdate stateUpdate
    );

    event ExitChallenged(
        types.StateUpdate stateUpdate
    );

    event ExitSettled(types.StateUpdate);


    constructor(
        address _disputeManagerAddress
    ) public {
        disputeManager = DisputeManager(_disputeManagerAddress);
    }

    function claim(bytes[] calldata _inputs, bytes[] calldata _witness)
        external{
        // validate inputs
        require(
            _inputs.length == 1,
            "inputs length does not match. expected 1"
        );
        types.Property memory suProperty = abi.decode(
            _inputs[0],
            (types.Property)
        );
        types.StateUpdate memory stateUpdate = Deserializer
            .deserializeStateUpdate(suProperty);

        // claim property to DisputeManager
        types.Property memory property = createClaimProperty(_inputs[0]);
        disputeManager.claim(property);

        emit ExitClaimed(stateUpdate);
    }


    /**
     * challenge prove the exiting coin has been spent.
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

        types.Transaction memory challengeTransaction = abi.decode(
            _challengeInputs[0],
            (types.Transaction)
        );
        // stateUpdateをchallengeTransactionがspentしてるかチェック
        // depositContractAddressとrangeを比較して、同じかどうかチェックする
        // types.StateUpdate memory challengeStateUpdate = Deserializer
        //     .deserializeStateUpdate(challengeSuProperty);
        
        // ここは
        // witnesses[0]はsignatureです。signatureがchallengeTransactionに対するもので、
        // かつsignerはstateUpdate.stateObject.inputs[0]のownerと一致するか

        CompiledPredicate predicate = CompiledPredicate(
            stateUpdate.stateObject.predicateAddress
        );

        require(
            predicate.decide(stateUpdate.stateObject.inputs, _witness),
            "State object decided to false"
        );

        //後処理

        disputeManager.challenge(claimProperty, challengeProperty);

        emit ExitChallenged(
            stateUpdate,
            challengeStateUpdate,
            inclusionProof
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
        types.Property memory property = createClaimProperty(_inputs[0]);
        disputeManager.settleGame(property);

        types.Property memory suProperty = abi.decode(
            _inputs[0],
            (types.Property)
        );
        types.StateUpdate memory stateUpdate = Deserializer
            .deserializeStateUpdate(suProperty);

        emit ExitSettled(stateUpdate);
    }

    // create checkpoint claim passed to dispute manager
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
}
