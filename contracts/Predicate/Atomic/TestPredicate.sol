pragma solidity ^0.5.0;
pragma experimental ABIEncoderV2;

import {DataTypes as types} from "../../DataTypes.sol";
import "../AtomicPredicate.sol";
import {UniversalAdjudicationContract} from "../../UniversalAdjudicationContract.sol";
import "../../Utils.sol";

contract TestPredicate is AtomicPredicate {
    address uacAddress;
    Utils utils;

    constructor(address _uacAddress, address utilsAddress) public {
        uacAddress = _uacAddress;
        utils = Utils(utilsAddress);
    }

    struct TestPredicateInput {
        uint value;
    }

    event ValueDecided(bool decision, bytes[] inputs);

    function createPropertyFromInput(bytes[] memory _input) public view returns (types.Property memory) {
        types.Property memory property = types.Property({
            predicateAddress: address(this),
            inputs: _input
        });
        return property;
    }

    function decideTrue(bytes[] memory _inputs) public {
        require(_inputs.length > 0, "This property is not true");

        types.Property memory property = createPropertyFromInput(_inputs);
        UniversalAdjudicationContract(uacAddress).setPredicateDecision(utils.getPropertyId(property), true);

        emit ValueDecided(true, _inputs);
    }

    function decideFalse(bytes[] memory _inputs) public {
        require(_inputs.length == 0, "This property is not true");

        types.Property memory property = createPropertyFromInput(_inputs);
        UniversalAdjudicationContract(uacAddress).setPredicateDecision(utils.getPropertyId(property), false);

        emit ValueDecided(false, _inputs);
    }

}
