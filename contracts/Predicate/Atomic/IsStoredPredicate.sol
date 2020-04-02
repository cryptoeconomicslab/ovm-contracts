pragma solidity ^0.5.0;
pragma experimental ABIEncoderV2;

import "../../Utils.sol";
import "./BaseAtomicPredicate.sol";
import {Storage} from "../../Storage.sol";

contract IsStoredPredicate is BaseAtomicPredicate {
    constructor(address _uacAddress, address _utilsAddress)
        public
        BaseAtomicPredicate(_uacAddress, _utilsAddress)
    {}

    function decide(bytes[] memory _inputs) public view returns (bool) {
        address addr = utils.bytesToAddress(_inputs[0]);
        Storage storageContract = Storage(addr);
        bytes memory value = storageContract.retrieve(_inputs[1]);
        return keccak256(_inputs[2]) == keccak256(value);
    }
}
