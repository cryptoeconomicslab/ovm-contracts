pragma solidity ^0.5.0;
pragma experimental ABIEncoderV2;

import {DataTypes as types} from "../../DataTypes.sol";
import "../AtomicPredicate.sol";
import {UniversalAdjudicationContract} from "../../UniversalAdjudicationContract.sol";
import "../../Utils.sol";
import "./IsValidStateTransitionPredicate.sol";

/**
 * LimboExit stands for the claim below.
 * def LimboExit(prev_su, tx, su) :=
 * exit(prev_su)
 * or (
 *  prev_su()
 *  and IsValidStateTransition(prev_su, tx, su)
 *  and exit(su))
 */
contract LimboExitPredicate is AtomicPredicate {
    UniversalAdjudicationContract adjudicationContract;
    Utils utils;
    address exitPredicateAddress;
    IsValidStateTransitionPredicate isValidStateTransitionPredicate;

    constructor(
        address _uacAddress,
        address _utilsAddress,
        address _exitPredicateAddress,
        address _isValidStateTransitionPredicate
    ) public {
        adjudicationContract = UniversalAdjudicationContract(_uacAddress);
        utils = Utils(_utilsAddress);
        exitPredicateAddress = _exitPredicateAddress;
        isValidStateTransitionPredicate = IsValidStateTransitionPredicate(_isValidStateTransitionPredicate);
    }

    function decide(bytes[] memory _inputs) public view returns (bool) {
        bytes[] memory inputsForPrevSu = new bytes[](1);
        bytes[] memory inputsForExitSu = new bytes[](1);
        inputsForPrevSu[0] = _inputs[0];
        inputsForExitSu[0] = _inputs[2];
        if(adjudicationContract.isDecidedById(keccak256(abi.encode(types.Property({
            predicateAddress: exitPredicateAddress,
            inputs: inputsForPrevSu
        }))))) {
            return true;
        }
        require(adjudicationContract.isDecidedById(keccak256(_inputs[0])), "prev_su() must be true");
        require(isValidStateTransitionPredicate.decide(_inputs), "IsValidStateTransition(prev_su, tx, su) must be true");
        require(adjudicationContract.isDecidedById(keccak256(abi.encode(types.Property({
            predicateAddress: exitPredicateAddress,
            inputs: inputsForExitSu
        })))), "exit(su) must be true");
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
