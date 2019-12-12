pragma solidity ^0.5.0;
pragma experimental ABIEncoderV2;

import {DataTypes as types} from "../../DataTypes.sol";
import "../AtomicPredicate.sol";
import {
    UniversalAdjudicationContract
} from "../../UniversalAdjudicationContract.sol";
import "../../Utils.sol";

contract TestPredicate is AtomicPredicate {
    address uacAddress;
    Utils utils;

    constructor(address _uacAddress, address utilsAddress) public {
        uacAddress = _uacAddress;
        utils = Utils(utilsAddress);
    }

    struct TestPredicateInput {
        uint256 value;
    }

    event ValueDecided(bool decision, bytes[] inputs);

    function decide(bytes[] memory _inputs) public pure returns (bool) {
        require(_inputs.length > 0, "This property is not true");
        return true;
    }

    function decideTrue(bytes[] memory _inputs) public {
        require(decide(_inputs), "This property is not true");
        
        types.Property memory property = types.Property({
            predicateAddress: address(this),
            inputs: _inputs
        });
        UniversalAdjudicationContract(uacAddress).setPredicateDecision(
            utils.getPropertyId(property),
            true
        );

        emit ValueDecided(true, _inputs);
    }

    function decideFalse(bytes[] memory _inputs) public {
        require(_inputs.length == 0, "This property is not true");

        types.Property memory property = types.Property({
            predicateAddress: address(this),
            inputs: _inputs
        });
        UniversalAdjudicationContract(uacAddress).setPredicateDecision(
            utils.getPropertyId(property),
            false
        );

        emit ValueDecided(false, _inputs);
    }

}
