pragma solidity ^0.6.0;
pragma experimental ABIEncoderV2;

interface DecidablePredicate {
    function decideWithWitness(
        bytes[] calldata _inputs,
        bytes[] calldata _witness
    ) external returns (bool);
}
