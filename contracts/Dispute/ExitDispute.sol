pragma solidity ^0.5.0;
pragma experimental ABIEncoderV2;
 
import {DataTypes as types} from "../DataTypes.sol";
import {Dispute} from './DisputeInterface.sol';
import {DisputeManager} from './DisputeManager.sol';
import "../Library/Deserializer.sol";
import {CompiledPredicate} from "../Predicate/CompiledPredicate.sol";

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

        require(
            stateUpdate.depositContractAddress ==
                challengeTransaction.depositContractAddress,
            "DepositContractAddress is invalid"
        );

        bool a = challengeTransaction.range.start >= stateUpdate.range.start && challengeTransaction.range.start < stateUpdate.range.end;
        bool b = stateUpdate.range.start >= challengeTransaction.range.start && stateUpdate.range.start < challengeTransaction.range.end;

        require(a || b, "range must have intersection");


        require(
            stateUpdate.blockNumber < challengeTransaction.maxBlockNumber,
            "BlockNumber must be smaller than challenged state"
        );


        // *******ここから******************************************
        //
        // stateUpdateをchallengeTransactionがspentしてるかチェック
        // depositContractAddressとrangeを比較して、同じかどうかチェックする
        // types.StateUpdate memory challengeStateUpdate = Deserializer
        //     .deserializeStateUpdate(challengeSuProperty);
        
        // ここは
        // witnesses[0]はsignatureです。signatureがchallengeTransactionに対するもので、
        // かつsignerはstateUpdate.stateObject.inputs[0]のownerと一致するか
        //
        // *******ここまで、メモ。マージされるまでに削除すること

        CompiledPredicate predicate = CompiledPredicate(
            stateUpdate.stateObject.predicateAddress
        );

        require(
            predicate.decide(stateUpdate.stateObject.inputs, _witness),
            "State object decided to false"
        );

        //後処理

        disputeManager.challenge(stateUpdate.stateObject, challengeTransaction.nextStateObject);

        emit ExitChallenged(
            stateUpdate
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
