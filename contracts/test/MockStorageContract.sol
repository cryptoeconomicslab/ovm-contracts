pragma solidity ^0.5.3;
pragma experimental ABIEncoderV2;

import {Storage} from "../Storage.sol";

contract MockStorage is Storage {
    bytes value;

    function set(bytes memory _value) public {
        value = _value;
    }

    function retrieve(bytes memory _key) public view returns (bytes memory) {
        return value;
    }
}
