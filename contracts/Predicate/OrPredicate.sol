pragma solidity ^0.5.0;
pragma experimental ABIEncoderV2;

import {DataTypes as types} from "../DataTypes.sol";
import "./LogicalConnective.sol";
import {DecidablePredicate} from "./DecidablePredicate.sol";

contract OrPredicate is LogicalConnective, DecidablePredicate {
    address notAddress;
    address andAddress;

    constructor(address _notAddress, address _andAddress) public {
        notAddress = _notAddress;
        andAddress = _andAddress;
    }

    /**
     * @dev Validates a child node of Or property in game tree.
     */
    function isValidChallenge(
        bytes[] calldata _inputs,
        bytes[] calldata _challengeInputs,
        types.Property calldata _challnge
    ) external view returns (bool) {
        // challenge must be and(not(p[0]), not(p[1]), ...)
        require(
            _challnge.predicateAddress == andAddress,
            "challenge must be And"
        );
        for (uint256 i = 0; i < _inputs.length; i++) {
            bytes[] memory inputs = new bytes[](1);
            inputs[0] = _inputs[i];
            types.Property memory p = types.Property({
                predicateAddress: notAddress,
                inputs: inputs
            });
            require(
                keccak256(abi.encode(p)) == keccak256(_challnge.inputs[i]),
                "inputs must be same"
            );
        }
        return true;
    }

    /**
     * @dev Decide property using witness
     */
    function decideWithWitness(bytes[] memory _inputs, bytes[] memory _witness)
        public
        returns (bool)
    {
        uint256 index = abi.decode(_witness[0], (uint256));
        require(
            index < _inputs.length,
            "witness must be smaller than inputs length"
        );
        bytes memory propertyBytes = _inputs[index];
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
}
