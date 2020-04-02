pragma solidity ^0.5.0;
pragma experimental ABIEncoderV2;

interface Storage {
    function retrieve(bytes calldata _key) external view returns (bytes memory);
}
