pragma solidity ^0.5.0;
pragma experimental ABIEncoderV2;

import {DataTypes as types} from "../DataTypes.sol";
import "./LogicalConnective.sol";
import "./DecidablePredicate.sol";
import "../Utils.sol";

contract ThereExistsSuchThatQuantifier is
    LogicalConnective,
    DecidablePredicate
{
    address notAddress;
    address andAddress;
    address forAddress;
    Utils utils;

    constructor(
        address _notAddress,
        address _andAddress,
        address _forAddress,
        address _utilsAddress
    ) public {
        andAddress = _andAddress;
        notAddress = _notAddress;
        forAddress = _forAddress;
        utils = Utils(_utilsAddress);
    }

    /**
     * @dev Validates a child node of ThereExistsSuchThat property in game tree.
     */
    function isValidChallenge(
        bytes[] calldata _inputs,
        bytes[] calldata _challengeInputs,
        types.Property calldata _challnge
    ) external view returns (bool) {
        // challenge must be for(, , not(p))
        require(
            _challnge.predicateAddress == forAddress,
            "challenge must be ForAllSuchThat"
        );
        bytes[] memory inputs = new bytes[](1);
        inputs[0] = _inputs[2];
        types.Property memory p = types.Property({
            predicateAddress: notAddress,
            inputs: inputs
        });
        require(
            keccak256(_inputs[1]) == keccak256(_challnge.inputs[1]),
            "variable must be same"
        );
        require(
            keccak256(abi.encode(p)) == keccak256(_challnge.inputs[2]),
            "inputs must be same"
        );
        return true;
    }

    function decideWithWitness(bytes[] memory _inputs, bytes[] memory _witness)
        public
        returns (bool)
    {
        bytes memory propertyBytes = replaceVariable(
            _inputs[2],
            _inputs[1],
            _witness[0]
        );

        types.Property memory property = abi.decode(
            propertyBytes,
            (types.Property)
        );
        DecidablePredicate predicate = DecidablePredicate(
            property.predicateAddress
        );
        bytes[] memory witness = new bytes[](_witness.length - 1);
        for (uint256 i = 1; i < _witness.length; i++) {
            witness[i] = _witness[i];
        }
        return predicate.decideWithWitness(property.inputs, witness);
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
                keccak256(utils.getInputValue(propertyBytes)) ==
                keccak256(placeholder)
            ) {
                return quantified;
            }
        }
        types.Property memory property = abi.decode(
            propertyBytes,
            (types.Property)
        );
        if (property.predicateAddress == notAddress) {
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
        } else if (property.predicateAddress == andAddress) {
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
                        keccak256(utils.getInputValue(property.inputs[i])) ==
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
