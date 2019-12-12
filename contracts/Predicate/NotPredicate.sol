pragma solidity ^0.5.0;
pragma experimental ABIEncoderV2;

import {DataTypes as types} from "../DataTypes.sol";
import "./LogicalConnective.sol";
import {
    UniversalAdjudicationContract
} from "../UniversalAdjudicationContract.sol";
import "../Utils.sol";

contract NotPredicate is LogicalConnective {
    address uacAddress;
    Utils utils;

    constructor(address _uacAddress, address utilsAddress) public {
        uacAddress = _uacAddress;
        utils = Utils(utilsAddress);
    }

    struct TestPredicateInput {
        uint256 value;
    }

    event ValueDecided(bool decision, types.Property innerProperty);

    function createPropertyFromInput(bytes[] memory _input)
        public
        view
        returns (types.Property memory)
    {
        types.Property memory property = types.Property({
            predicateAddress: address(this),
            inputs: _input
        });
        return property;
    }

    /**
     * @dev Validates a child node of Not property in game tree.
     */
    function isValidChallenge(
        bytes[] calldata _inputs,
        bytes calldata _challengeInput,
        types.Property calldata _challenge
    ) external view returns (bool) {
        // The valid challenge of not(p) is p and _inputs[0] is p here
        return keccak256(_inputs[0]) == keccak256(abi.encode(_challenge));
    }

    /**
     * @dev Decides true
     */
    function decideTrue(types.Property memory innerProperty) public {
        require(
            !UniversalAdjudicationContract(uacAddress).isDecided(innerProperty),
            "inner property must be false"
        );
        bytes[] memory inputs = new bytes[](1);
        inputs[0] = abi.encode(innerProperty);
        types.Property memory property = createPropertyFromInput(inputs);
        UniversalAdjudicationContract(uacAddress).setPredicateDecision(
            utils.getPropertyId(property),
            true
        );

        emit ValueDecided(true, innerProperty);
    }
}
