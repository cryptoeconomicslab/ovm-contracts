pragma solidity ^0.6.0;
pragma experimental ABIEncoderV2;

import {DataTypes as types} from "../DataTypes.sol";

interface CompiledPredicate {
    function payoutContractAddress() external view returns (address);

    function isValidChallenge(
        bytes[] calldata _inputs,
        bytes[] calldata _challengeInputs,
        types.Property calldata _challenge
    ) external view returns (bool);

    /**
     * @dev get valid child property of game tree with challengeInputs
     */
    function getChild(bytes[] calldata inputs, bytes[] calldata challengeInput)
        external
        view
        returns (types.Property memory);

    function decide(bytes[] calldata _inputs, bytes[] calldata _witness)
        external
        view
        returns (bool);

    function decideTrue(bytes[] calldata _inputs, bytes[] calldata _witness)
        external;

    function decideWithWitness(
        bytes[] calldata _inputs,
        bytes[] calldata _witness
    ) external returns (bool);
}
