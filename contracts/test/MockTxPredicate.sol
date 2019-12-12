pragma solidity ^0.5.0;
pragma experimental ABIEncoderV2;

import {AtomicPredicate} from "../Predicate/AtomicPredicate.sol";

/**
 * @title MockTxPredicate
 * @notice Mock of tx predicate
 */
contract MockTxPredicate is AtomicPredicate {
    constructor() public {}
    function decideTrue(bytes[] calldata _inputs) external {}
}
