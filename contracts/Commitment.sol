pragma solidity ^0.5.0;

/**
 * @title CommitmentChain
 * @notice This is mock commitment chain contract. Spec is http://spec.plasma.group/en/latest/src/02-contracts/commitment-contract.html
 */
contract Commitment {
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
}
