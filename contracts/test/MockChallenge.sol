pragma solidity ^0.5.3;
pragma experimental ABIEncoderV2;

import "../Predicate/LogicalConnective.sol";

contract MockChallenge {
    constructor() public {}

    function isValidChallenge(
        types.Property memory _property,
        bytes memory _challengeInput,
        types.Property memory _child
    ) public view returns (bool) {
        return
            LogicalConnective(_property.predicateAddress).isValidChallenge(
                _property.inputs,
                _challengeInput,
                _child
            );
    }
}
