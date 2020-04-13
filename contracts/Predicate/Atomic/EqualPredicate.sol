pragma solidity ^0.6.0;
pragma experimental ABIEncoderV2;

import "../../Utils.sol";
import "../AtomicPredicate.sol";
import "./BaseAtomicPredicate.sol";

contract EqualPredicate is BaseAtomicPredicate {
    constructor(address _uacAddress, address _utilsAddress)
        public
        BaseAtomicPredicate(_uacAddress, _utilsAddress)
    {}

    function decide(bytes[] memory _inputs)
        public
        view
        override
        returns (bool)
    {
        bytes32 hashOfFirstInput = keccak256(_inputs[0]);
        bytes32 hashOfSecondInput = keccak256(_inputs[1]);
        require(
            hashOfFirstInput == hashOfSecondInput,
            "2 inputs must be equal"
        );
        return true;
    }
}
