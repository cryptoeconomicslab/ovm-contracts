pragma solidity ^0.5.0;
pragma experimental ABIEncoderV2;

/**
 * @dev atomic predicate interface. do not directly inherit this interface. use BaseAtomicPredicate instead
 */
interface AtomicPredicate {
    /**
     * @dev used to decide the input is truthy
     * @param _inptus input bytes
     */
    function decideTrue(bytes[] calldata _inputs) external;

    /**
     * @dev used to decide _inputs
     * @param _inptus input bytes
     */
    function decide(bytes[] calldata _inputs) external view returns (bool);
}
