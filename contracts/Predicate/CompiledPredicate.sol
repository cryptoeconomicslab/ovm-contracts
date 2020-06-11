pragma solidity ^0.5.0;
pragma experimental ABIEncoderV2;

import {DataTypes as types} from "../DataTypes.sol";

/**
 * @dev Compiled predicate interface. Predicates compiled from predicate DSL implement this interface
 */
interface CompiledPredicate {
    /**
     * @dev this method should return corresponding payout contract address
     */
    function payoutContractAddress() external view returns (address);

    /**
     * @dev this method should implement a logic to tell if certain input array is valid challenge input of
     * a property
     * @param _inputs challenged input
     * @param _challengeInputs challenging input
     * @param _challenge challenging property
     */
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
