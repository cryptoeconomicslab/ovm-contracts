pragma solidity ^0.5.0;
pragma experimental ABIEncoderV2;

import {DataTypes as types} from "../../DataTypes.sol";
import "../AtomicPredicate.sol";
import {UniversalAdjudicationContract} from "../../UniversalAdjudicationContract.sol";
import "../../Utils.sol";
import "../Atomic/IsContainedPredicate.sol";

/**
 * IsValidStateTransitionPredicate stands for the claim below.
 * def IsValidStateTransition(prev_su, tx, su) :=
 *   eq(tx.adderss, Tx.address)
 *   and eq(tx.0, prev_su.0)
 *   and within(tx.1, prev_su.1)
 *   and eq(tx.2, prev_su.2)
 *   and eq(tx.3, su.3)
 */
contract IsValidStateTransitionPredicate is AtomicPredicate {
    UniversalAdjudicationContract adjudicationContract;
    Utils utils;
    address txAddress;
    IsContainedPredicate isContainedPredicate;

    constructor(
        address _uacAddress,
        address _utilsAddress,
        address _txAddress,
        address _isContainedPredicateAddress
    ) public {
        adjudicationContract = UniversalAdjudicationContract(_uacAddress);
        utils = Utils(_utilsAddress);
        txAddress = _txAddress;
        isContainedPredicate = IsContainedPredicate(_isContainedPredicateAddress);
    }

    function decide(bytes[] memory _inputs) public view returns (bool) {
        types.Property memory previousStateUpdate = abi.decode(_inputs[0], (types.Property));
        types.Property memory transaction = abi.decode(_inputs[1], (types.Property));
        types.Property memory stateUpdate = abi.decode(_inputs[2], (types.Property));
        bytes[] memory inputsForIsContained = new bytes[](2);
        inputsForIsContained[0] = transaction.inputs[1];
        inputsForIsContained[1] = previousStateUpdate.inputs[1];
        require(transaction.predicateAddress == txAddress, "transaction.predicateAddress must be Tx.address");
        require(keccak256(transaction.inputs[0]) == keccak256(previousStateUpdate.inputs[0]), "token must be same");
        require(isContainedPredicate.decide(inputsForIsContained), "range must be included");
        require(keccak256(transaction.inputs[2]) == keccak256(previousStateUpdate.inputs[2]), "input block number must be same");
        require(keccak256(transaction.inputs[3]) == keccak256(stateUpdate.inputs[3]), "state object must be same");
        return true;
    }

    function decideTrue(bytes[] memory _inputs) public {
        require(decide(_inputs), "must decide true");
        types.Property memory property = types.Property({
            predicateAddress: address(this),
            inputs: _inputs
        });
        adjudicationContract.setPredicateDecision(utils.getPropertyId(property), true);
    }
}
