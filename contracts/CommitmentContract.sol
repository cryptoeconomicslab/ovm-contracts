pragma solidity ^0.5.0;
pragma experimental ABIEncoderV2;

import {DataTypes as types} from "./DataTypes.sol";
import "./Utils.sol";

/**
 * @title CommitmentChain
 * @notice This is mock commitment chain contract. Spec is http://spec.plasma.group/en/latest/src/02-contracts/commitment-contract.html
 */
contract CommitmentContract {
    // Single operator address
    address public operatorAddress;
    // Current block number of commitment chain
    uint256 public currentBlock = 0;
    // History of Merkle Root
    mapping(uint256 => bytes32) public blocks;

    // Event definitions
    event BlockSubmitted(uint64 blockNumber, bytes32 root);

    modifier isOperator() {
        require(
            msg.sender == operatorAddress,
            "msg.sender should be registered operator address"
        );
        _;
    }

    constructor(address _operatorAddress) public {
        operatorAddress = _operatorAddress;
    }

    function submitRoot(uint64 blkNumber, bytes32 _root) public isOperator {
        require(
            currentBlock + 1 == blkNumber,
            "blkNumber should be next block"
        );
        blocks[blkNumber] = _root;
        currentBlock = blkNumber;
        emit BlockSubmitted(blkNumber, _root);
    }

    /**
     * verifyInclusion method verifies inclusion of message in Double Layer Tree.
     *     The message has range and token address and these also must be verified.
     *     Please see https://docs.plasma.group/projects/spec/en/latest/src/01-core/double-layer-tree.html for further details.
     * @param _leaf a message to verify its inclusion
     * @param _tokenAddress token address of the message
     * @param _range range of the message
     * @param _inclusionProof The proof data to verify inclusion
     * @param _blkNumber block number where the Merkle root is stored
     */
    function verifyInclusion(
        bytes32 _leaf,
        address _tokenAddress,
        types.Range memory _range,
        types.InclusionProof memory _inclusionProof,
        uint256 _blkNumber
    ) public view returns (bool) {
        // Calcurate the root of interval tree
        (bytes32 computedRoot, uint256 implicitEnd) = computeIntervalTreeRoot(
            _leaf,
            _inclusionProof.intervalInclusionProof.leafStart,
            _inclusionProof.intervalInclusionProof.leafPosition,
            _inclusionProof.intervalInclusionProof.siblings
        );
        require(
            _range.start >= _inclusionProof.intervalInclusionProof.leafStart &&
                _range.end <= implicitEnd,
            "required range must not exceed the implicit range"
        );
        // Calcurate the root of address tree
        computedRoot = computeAddressTreeRoot(
            computedRoot,
            _tokenAddress,
            _inclusionProof.addressInclusionProof.leafPosition,
            _inclusionProof.addressInclusionProof.siblings
        );
        return computedRoot == blocks[_blkNumber];
    }

    /**
     * @dev computeIntervalTreeRoot method calculates the root of Interval Tree.
     *     Please see https://docs.plasma.group/projects/spec/en/latest/src/01-core/merkle-interval-tree.html for further details.
     */
    function computeIntervalTreeRoot(
        bytes32 computedRoot,
        uint256 computedStart,
        uint256 intervalTreeMerklePath,
        types.IntervalTreeNode[] memory intervalTreeProof
    ) private pure returns (bytes32, uint256) {
        uint256 firstRightSiblingStart = 2**256 - 1;
        bool isfirstRightSiblingStartSet = false;
        for (uint256 i = 0; i < intervalTreeProof.length; i += 1) {
            bytes32 sibling = intervalTreeProof[i].data;
            uint256 siblingStart = intervalTreeProof[i].start;
            uint8 isComputedRightSibling = uint8(
                (intervalTreeMerklePath >> i) & 1
            );
            if (isComputedRightSibling == 1) {
                computedRoot = getParent(
                    sibling,
                    siblingStart,
                    computedRoot,
                    computedStart
                );
            } else {
                if (!isfirstRightSiblingStartSet) {
                    firstRightSiblingStart = siblingStart;
                    isfirstRightSiblingStartSet = true;
                }
                require(
                    firstRightSiblingStart <= siblingStart,
                    "firstRightSiblingStart must be greater than siblingStart"
                );
                computedRoot = getParent(
                    computedRoot,
                    computedStart,
                    sibling,
                    siblingStart
                );
                computedStart = siblingStart;
            }
        }
        return (computedRoot, firstRightSiblingStart);
    }

    function getParent(
        bytes32 _left,
        uint256 _leftStart,
        bytes32 _right,
        uint256 _rightStart
    ) private pure returns (bytes32) {
        require(
            _rightStart >= _leftStart,
            "_leftStart must be less than _rightStart"
        );
        return
            keccak256(abi.encodePacked(_left, _leftStart, _right, _rightStart));
    }

    /**
     * @dev computeAddressTreeRoot method calculates the root of Address Tree.
     *     Address Tree is almost the same as Merkle Tree.
     *     But leaf has their address and we can verify the address each leaf belongs to.
     */
    function computeAddressTreeRoot(
        bytes32 computedRoot,
        address computeAddress,
        uint256 addressTreeMerklePath,
        types.AddressTreeNode[] memory addressTreeProof
    ) private pure returns (bytes32) {
        for (uint256 i = 0; i < addressTreeProof.length; i += 1) {
            bytes32 sibling = addressTreeProof[i].data;
            address siblingAddress = addressTreeProof[i].tokenAddress;
            uint8 isComputedRightSibling = uint8(
                (addressTreeMerklePath >> i) & 1
            );
            if (isComputedRightSibling == 1) {
                computedRoot = getParentOfAddressTreeNode(
                    sibling,
                    siblingAddress,
                    computedRoot,
                    computeAddress
                );
                computeAddress = siblingAddress;
            } else {
                computedRoot = getParentOfAddressTreeNode(
                    computedRoot,
                    computeAddress,
                    sibling,
                    siblingAddress
                );
            }
        }
        return computedRoot;
    }

    function getParentOfAddressTreeNode(
        bytes32 _left,
        address _leftAddress,
        bytes32 _right,
        address _rightAddress
    ) private pure returns (bytes32) {
        return
            keccak256(
                abi.encodePacked(_left, _leftAddress, _right, _rightAddress)
            );
    }

}
