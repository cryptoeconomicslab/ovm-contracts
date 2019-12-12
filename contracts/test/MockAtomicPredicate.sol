pragma solidity ^0.5.0;
pragma experimental ABIEncoderV2;

import {AtomicPredicate} from "../Predicate/AtomicPredicate.sol";

/**
 * @title MockAtomicPredicate
 * @notice Mock of atomic predicate
 */
contract MockAtomicPredicate is AtomicPredicate {
    constructor() public {}
    function decide(bytes[] memory _inputs) public view returns (bool) {
        return keccak256(_inputs[0]) != keccak256(bytes("fail"));
    }
    function decideTrue(bytes[] memory _inputs) public {}
}
