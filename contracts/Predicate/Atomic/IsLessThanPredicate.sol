pragma solidity ^0.5.0;
pragma experimental ABIEncoderV2;

import "../../Utils.sol";
import "../AtomicPredicate.sol";
import "./BaseAtomicPredicate.sol";

contract IsLessThanPredicate is BaseAtomicPredicate {
    constructor(address _uacAddress, address _utilsAddress)
        public
        BaseAtomicPredicate(_uacAddress, _utilsAddress)
    {}

    function decide(bytes[] memory _inputs) public view returns (bool) {
        uint256 first = utils.bytesToUint(_inputs[0]);
        uint256 second = utils.bytesToUint(_inputs[1]);
        require(first < second, "first input is not less than second input");
        return true;
    }
}
