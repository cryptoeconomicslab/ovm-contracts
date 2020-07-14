pragma solidity ^0.5.0;
pragma experimental ABIEncoderV2;

contract MockSpentChallenge  {
    uint256 public calledCount;
    function verify(
        bytes[] calldata _inputs,
        bytes[] calldata _witness
    ) external {
        calledCount++;
    }
}