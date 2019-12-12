pragma solidity ^0.5.0;
pragma experimental ABIEncoderV2;

import {DataTypes as types} from "../DataTypes.sol";
import "./AtomicPredicate.sol";
import "./LogicalConnective.sol";
import {
    UniversalAdjudicationContract
} from "../UniversalAdjudicationContract.sol";
import "../Utils.sol";

contract ForAllSuchThatQuantifier is LogicalConnective {
    address uacAddress;
    address notPredicateAddress;
    address andPredicateAddress;
    Utils utils;

    constructor(
        address _uacAddress,
        address _notPredicateAddress,
        address _andPredicateAddress,
        address _utilsAddress
    ) public {
        uacAddress = _uacAddress;
        notPredicateAddress = _notPredicateAddress;
        andPredicateAddress = _andPredicateAddress;
        utils = Utils(_utilsAddress);
    }

    /**
     * @dev Validates a child node of ForAllSuchThat property in game tree.
     */
    function isValidChallenge(
        bytes[] calldata _inputs,
        bytes calldata _challengeInput,
        types.Property calldata _challnge
    ) external view returns (bool) {
        // challenge should be not(p[quantified])
        require(
            _challnge.predicateAddress == notPredicateAddress,
            "_challenge must be Not predicate"
        );
        // check inner property
        require(
            keccak256(
                replaceVariable(_inputs[2], _inputs[1], _challengeInput)
            ) ==
                keccak256(_challnge.inputs[0]),
            "must be valid inner property"
        );
        return true;
    }

    /**
     * @dev Replace placeholder by quantified in propertyBytes
     */
    function replaceVariable(
        bytes memory propertyBytes,
        bytes memory placeholder,
        bytes memory quantified
    ) private view returns (bytes memory) {
        // Support property as the variable in ForAllSuchThatQuantifier.
        // This code enables meta operation which we were calling eval without adding specific "eval" contract.
        // For instance, we can write a property like `∀su ∈ SU: su()`.
        if (utils.isPlaceholder(propertyBytes)) {
            if (
                keccak256(utils.getPlaceholderName(propertyBytes)) ==
                keccak256(placeholder)
            ) {
                return quantified;
            }
        }
        types.Property memory property = abi.decode(
            propertyBytes,
            (types.Property)
        );
        if (property.predicateAddress == notPredicateAddress) {
            property.inputs[0] = replaceVariable(
                property.inputs[0],
                placeholder,
                quantified
            );
        } else if (property.predicateAddress == address(this)) {
            property.inputs[2] = replaceVariable(
                property.inputs[2],
                placeholder,
                quantified
            );
        } else if (property.predicateAddress == andPredicateAddress) {
            for (uint256 i = 0; i < property.inputs.length; i++) {
                property.inputs[i] = replaceVariable(
                    property.inputs[i],
                    placeholder,
                    quantified
                );
            }
        } else {
            for (uint256 i = 0; i < property.inputs.length; i++) {
                if (utils.isPlaceholder(property.inputs[i])) {
                    if (
                        keccak256(
                            utils.getPlaceholderName(property.inputs[i])
                        ) ==
                        keccak256(placeholder)
                    ) {
                        property.inputs[i] = quantified;
                    }
                }
            }
        }
        return abi.encode(property);
    }
}
