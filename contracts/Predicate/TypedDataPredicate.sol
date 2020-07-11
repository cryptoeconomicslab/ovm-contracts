pragma solidity ^0.5.0;
pragma experimental ABIEncoderV2;

/**
 * @dev TypedDataPredicate provides APIs for TypedData
 */
interface TypedDataPredicate {
    function packTypes() external pure returns (bytes memory);

    function packValues(bytes[] calldata _inputs)
        external
        pure
        returns (bytes memory);
}
