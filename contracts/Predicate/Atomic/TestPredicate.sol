pragma solidity ^0.6.0;
pragma experimental ABIEncoderV2;

import {DataTypes as types} from "../../DataTypes.sol";
import "./BaseAtomicPredicate.sol";

contract TestPredicate is BaseAtomicPredicate {
    struct TestPredicateInput {
        uint256 value;
    }

    event ValueDecided(bool decision, bytes[] inputs);

    constructor(address _uacAddress, address _utilsAddress)
        public
        BaseAtomicPredicate(_uacAddress, _utilsAddress)
    {}

    function decide(bytes[] memory _inputs)
        public
        view
        override
        returns (bool)
    {
        require(_inputs.length > 0, "This property is not true");
        return true;
    }

    function decideFalse(bytes[] memory _inputs) public {
        require(_inputs.length == 0, "This property is not true");

        types.Property memory property = types.Property({
            predicateAddress: address(this),
            inputs: _inputs
        });
        UniversalAdjudicationContract(adjudicationContract)
            .setPredicateDecision(utils.getPropertyId(property), false);

        emit ValueDecided(false, _inputs);
    }
}
