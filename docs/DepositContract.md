## `DepositContract`






### `constructor(address _erc20, address _commitmentContract, address _universalAdjudicationContract, address _stateUpdatePredicateContract, address _exitPredicateAddress, address _exitDepositPredicateAddress)` (public)





### `deposit(uint256 _amount, struct DataTypes.Property _initialState)` (public)



deposit ERC20 token to deposit contract with initial state.
following https://docs.plasma.group/projects/spec/en/latest/src/02-contracts/deposit-contract.html#deposit


### `extendDepositedRanges(uint256 _amount)` (public)





### `removeDepositedRange(struct DataTypes.Range _range, uint256 _depositedRangeId)` (public)





### `finalizeCheckpoint(struct DataTypes.Property _checkpointProperty)` (public)

finalizeCheckpoint




### `finalizeExit(struct DataTypes.Property _exitProperty, uint256 _depositedRangeId) → struct DataTypes.StateUpdate` (public)

finalizeExit


The steps of finalizeExit.
1. Serialize exit property
2. check the property is decided by Adjudication Contract.
3. Transfer asset to payout contract corresponding to StateObject.
Please alse see https://docs.plasma.group/projects/spec/en/latest/src/02-contracts/deposit-contract.html#finalizeexit

### `isSubrange(struct DataTypes.Range _subrange, struct DataTypes.Range _surroundingRange) → bool` (public)






### `CheckpointFinalized(bytes32 checkpointId, struct DataTypes.Checkpoint checkpoint)`





### `ExitFinalized(bytes32 exitId)`





### `DepositedRangeExtended(struct DataTypes.Range newRange)`





### `DepositedRangeRemoved(struct DataTypes.Range removedRange)`





