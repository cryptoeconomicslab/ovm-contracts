pragma solidity ^0.5.0;
pragma experimental ABIEncoderV2;

/**
 * Storage interface is used to implement storage for `IsStoredPredicate`.
 */
interface Storage {
    function retrieve(bytes calldata _key) external view returns (bytes memory);
}
