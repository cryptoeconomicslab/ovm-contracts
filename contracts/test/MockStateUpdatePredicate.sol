pragma solidity ^0.5.0;
pragma experimental ABIEncoderV2;

import { AtomicPredicate } from "../Predicate/AtomicPredicate.sol";

/**
 * @title MockStateUpdatePredicate
 * @notice Mock of state update predicate
 */
contract MockStateUpdatePredicate is AtomicPredicate {
    constructor() public {
    }
    function decideTrue(bytes[] calldata _inputs) external {
    }
}
