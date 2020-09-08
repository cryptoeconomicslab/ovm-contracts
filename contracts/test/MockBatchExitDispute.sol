pragma solidity ^0.5.0;
pragma experimental ABIEncoderV2;

import {DataTypes as types} from "../DataTypes.sol";

contract MockBatchExitDispute {
    types.Decision decision = types.Decision.True;

    function setClaimDecision(bool _decision) public {
        if (_decision) {
            decision = types.Decision.True;
        } else {
            decision = types.Decision.False;
        }
    }

    function claim(bytes[] memory _inputs, bytes[] memory _witness) public {}

    function challenge(
        bytes[] memory _inputs,
        bytes[] memory _challengeInputs,
        bytes[] memory _witness
    ) public {}

    function removeChallenge(
        bytes[] memory _inputs,
        bytes[] memory _challengeInputs,
        bytes[] memory _witness
    ) public {}

    function settle(bytes[] memory _inputs) public {}

    function getClaimDecision(types.StateUpdate[] memory _exits)
        public
        view
        returns (types.Decision)
    {
        return decision;
    }
}
