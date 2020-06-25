pragma solidity ^0.5.0;
pragma experimental ABIEncoderV2;

import {DataTypes as types} from "../DataTypes.sol";

interface Dispute {
    function isValidClaim(
        bytes[] calldata _propertyInputs,
        bytes[] calldata _witness
    ) external view returns (bool);

    function isValidChallenge(
        bytes[] calldata _propertyInputs,
        bytes[] calldata _challengeInputs,
        bytes[] calldata _witness
    ) external view returns (bool);

    function canRemoveChallenge(
        bytes[] calldata _challengeInputs,
        bytes[] calldata _witness
    ) external view returns (bool);
}
