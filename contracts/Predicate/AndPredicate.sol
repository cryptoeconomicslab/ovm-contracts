pragma solidity ^0.5.0;
pragma experimental ABIEncoderV2;

import {DataTypes as types} from "../DataTypes.sol";
import "./DecidablePredicate.sol";
import "./LogicalConnective.sol";
import {
    UniversalAdjudicationContract
} from "../UniversalAdjudicationContract.sol";
import "../Utils.sol";

contract AndPredicate is LogicalConnective, DecidablePredicate {
    address uacAddress;
    address notPredicateAddress;
    Utils utils;

    constructor(
        address _uacAddress,
        address _notPredicateAddress,
        address utilsAddress
    ) public {
        uacAddress = _uacAddress;
        notPredicateAddress = _notPredicateAddress;
        utils = Utils(utilsAddress);
    }

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
     * @dev Validates a child node of And property in game tree.
     */
    function isValidChallenge(
        bytes[] calldata _inputs,
        bytes[] calldata _challengeInputs,
        types.Property calldata _challnge
    ) external view returns (bool) {
        // challengeInput is index of child property
        uint256 index = abi.decode(_challengeInputs[0], (uint256));
        // challenge should be not(p[index])
        require(_challnge.predicateAddress == notPredicateAddress);
        require(keccak256(_inputs[index]) == keccak256(_challnge.inputs[0]));
        return true;
    }

    /**
     * @dev Can decide true when all child properties are decided true
     */
    function decideTrue(types.Property[] memory innerProperties) public {
        for (uint256 i = 0; i < innerProperties.length; i++) {
            require(
                UniversalAdjudicationContract(uacAddress).isDecided(
                    innerProperties[i]
                ),
                "This property isn't true"
            );
        }
        bytes[] memory inputs = new bytes[](innerProperties.length);
        for (uint256 i = 0; i < innerProperties.length; i++) {
            inputs[i] = abi.encode(innerProperties[i]);
        }
        types.Property memory property = createPropertyFromInput(inputs);
        UniversalAdjudicationContract(uacAddress).setPredicateDecision(
            property,
            true
        );
    }

    function decideWithWitness(bytes[] memory _inputs, bytes[] memory _witness)
        public
        returns (bool)
    {
        return false;
    }
}
