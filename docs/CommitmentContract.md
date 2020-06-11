## `CommitmentContract`
This is mock commitment chain contract. Spec is http://spec.plasma.group/en/latest/src/02-contracts/commitment-contract.html


### `isOperator()`



#### parameters
### `constructor(address _operatorAddress)` (public)



#### parameters
### `submitRoot(uint64 blkNumber, bytes32 _root)` (public)



#### parameters
### `retrieve(bytes _key) → bytes` (public)



#### parameters
### `verifyInclusionWithRoot(bytes32 _leaf, address _tokenAddress, struct DataTypes.Range _range, struct DataTypes.InclusionProof _inclusionProof, bytes32 _root) → bool` (public)
verifyInclusionWithRoot method verifies inclusion proof in Double Layer Tree.
The message has range and token address and these also must be verified.
Please see https://docs.plasma.group/projects/spec/en/latest/src/01-core/double-layer-tree.html for further details.



#### parameters
- `_leaf`: a message to verify its inclusion

- `_tokenAddress`: token address of the message

- `_range`: range of the message

- `_inclusionProof`: The proof data to verify inclusion

- `_root`: merkle root to verify inclusionProof
### `verifyInclusion(bytes32 _leaf, address _tokenAddress, struct DataTypes.Range _range, struct DataTypes.InclusionProof _inclusionProof, uint256 _blkNumber) → bool` (public)
verifyInclusion method verifies inclusion of message in Double Layer Tree.
receives block number as its fifth argument instead of merkle root hash.
use the block number to retrieve merkle root stored in contract's state.



#### parameters
- `_leaf`: a message to verify its inclusion

- `_tokenAddress`: token address of the message

- `_range`: range of the message

- `_inclusionProof`: The proof data to verify inclusion

- `_blkNumber`: block number where the Merkle root is stored
### `BlockSubmitted(uint64 blockNumber, bytes32 root)`



#### parameters
