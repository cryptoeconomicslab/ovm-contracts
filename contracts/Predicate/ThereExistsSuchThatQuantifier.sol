pragma solidity ^0.5.0;
pragma experimental ABIEncoderV2;

import {DataTypes as types} from "../DataTypes.sol";
import "./LogicalConnective.sol";
import "./DecidablePredicate.sol";

contract ThereExistsSuchThatQuantifier is
    LogicalConnective,
    DecidablePredicate
{
    address notAddress;
    address forAddress;

    constructor(address _notAddress, address _forAddress) public {
        notAddress = _notAddress;
        forAddress = _forAddress;
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
        return false;
    }
}
