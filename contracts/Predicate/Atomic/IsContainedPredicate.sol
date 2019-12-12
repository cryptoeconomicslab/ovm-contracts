pragma solidity ^0.5.0;
pragma experimental ABIEncoderV2;

import {DataTypes as types} from "../../DataTypes.sol";
import {
    UniversalAdjudicationContract
} from "../../UniversalAdjudicationContract.sol";
import "../AtomicPredicate.sol";
import "../../Utils.sol";

contract IsContainedPredicate is AtomicPredicate {
    UniversalAdjudicationContract adjudicationContract;
    Utils utils;

    constructor(address _uacAddress, address _utilsAddress) public {
        adjudicationContract = UniversalAdjudicationContract(_uacAddress);
        utils = Utils(_utilsAddress);
    }

    function decide(bytes[] memory _inputs) public pure returns (bool) {
        types.Range memory range = abi.decode(_inputs[0], (types.Range));
        types.Range memory subrange = abi.decode(_inputs[1], (types.Range));
        require(
            range.start <= subrange.start && subrange.end <= range.end,
            "range must contain subrange"
        );
        return true;
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
