pragma solidity ^0.5.0;
pragma experimental ABIEncoderV2;

import {DataTypes as types} from "../DataTypes.sol";

interface CompiledPredicate {
    function isValidChallenge(
        bytes[] calldata _inputs,
        bytes calldata _challengeInput,
        types.Property calldata _challenge
    ) external view returns (bool);
    function decide(bytes[] calldata _inputs, bytes[] calldata _witness)
        external
        view
        returns (bool);
    function decideTrue(bytes[] calldata _inputs, bytes[] calldata _witness)
        external;
}
