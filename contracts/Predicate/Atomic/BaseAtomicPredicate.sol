pragma solidity ^0.5.0;
pragma experimental ABIEncoderV2;

import {DataTypes as types} from "../../DataTypes.sol";
import {
    UniversalAdjudicationContract
} from "../../UniversalAdjudicationContract.sol";
import "../AtomicPredicate.sol";
import "../DecidablePredicate.sol";
import "../../Utils.sol";

contract BaseAtomicPredicate is AtomicPredicate, DecidablePredicate {
    UniversalAdjudicationContract public adjudicationContract;
    Utils public utils;

    constructor(address _uacAddress, address _utilsAddress) public {
        adjudicationContract = UniversalAdjudicationContract(_uacAddress);
        utils = Utils(_utilsAddress);
    }

    function decide(bytes[] memory _inputs) public view returns (bool) {
        return false;
    }

    function decideWithWitness(bytes[] memory _inputs, bytes[] memory _witness)
        public
        returns (bool)
    {
        return decide(_inputs);
    }

    function decideTrue(bytes[] memory _inputs) public {
        require(decide(_inputs), "must decide true");
        types.Property memory property = types.Property({
            predicateAddress: address(this),
            inputs: _inputs
        });
        adjudicationContract.setPredicateDecision(
            utils.getPropertyId(property),
            true
        );
    }
}
