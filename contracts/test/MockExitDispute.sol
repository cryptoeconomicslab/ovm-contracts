pragma solidity ^0.5.0;
pragma experimental ABIEncoderV2;

contract MockExitDispute {
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
}
