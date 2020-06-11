## `DepositContract`
Deposit contract is contract which manages tokens that users deposit when entering plasma.
One deposit contract exists for each ERC20 contract. It keeps track of how much funds are deposited in a plasma.
Client have to interact with this contract in order to enter or exiting from the plasma.


### `constructor(address _erc20, address _commitmentContract, address _universalAdjudicationContract, address _stateUpdatePredicateContract, address _exitPredicateAddress, address _exitDepositPredicateAddress)` (public)



#### parameters
### `deposit(uint256 _amount, struct DataTypes.Property _initialState)` (public)
Deposit ERC20 token to deposit contract with initial state represented as Property struct.


Client needs to approve this contract to transfer specified ERC20 token using `approve` method of ERC20 token before calling this method.

#### parameters
- `_amount`: Token amount to deposit into plasma.

- `_initialState`: Initial state of deposited token. OwnershipProperty is used for ordinary cases.
### `extendDepositedRanges(uint256 _amount)` (public)



#### parameters
### `removeDepositedRange(struct DataTypes.Range _range, uint256 _depositedRangeId)` (public)



#### parameters
### `finalizeCheckpoint(struct DataTypes.Property _checkpointProperty)` (public)
Method used to finalize a new checkpoint.


Given checkpoint property, checks if the property is already decided. If it's decided to true,
create a new checkpoint with the property and emit an CheckpointFinalized event.

#### parameters
- `_checkpointProperty`: Property instance of checkpoint predicate.
### `finalizeExit(struct DataTypes.Property _exitProperty, uint256 _depositedRangeId) → struct DataTypes.StateUpdate` (public)
Client calls this method to finalize withdrawal process. If succeed, ethereum account receives deposited amount corresponding
to the state.


finalizeExit checks if given exit property is already decided. If it's decided, it sends token back to the owner.
The steps of finalizeExit.
1. Serialize exit property
2. check the property is decided by Adjudication Contract.
3. Transfer asset to payout contract corresponding to StateObject.
Please alse see https://docs.plasma.group/projects/spec/en/latest/src/02-contracts/deposit-contract.html#finalizeexit

#### parameters
- `_exitProperty`: A property which is an instance of exit predicate and its inputs are range and StateUpdate that exiting account wants to withdraw.
_exitProperty can be a property of either ExitPredicate or ExitDepositPredicate.

- `_depositedRangeId`: Id of deposited range

### `isSubrange(struct DataTypes.Range _subrange, struct DataTypes.Range _surroundingRange) → bool` (public)



#### parameters
### `CheckpointFinalized(bytes32 checkpointId, struct DataTypes.Checkpoint checkpoint)`
Emitted when checkpoint is finalized



#### parameters
- `checkpointId`: Hash of the checkpoint property

- `checkpoint`: Finalized checkpoint
### `ExitFinalized(bytes32 exitId)`
Emitted when exit is finalized



#### parameters
- `exitId`: Hash of the exit property
### `DepositedRangeExtended(struct DataTypes.Range newRange)`
Emitted when deposit range is extended



#### parameters
- `newRange`: new range added to depositedRange
### `DepositedRangeRemoved(struct DataTypes.Range removedRange)`
Emitted when deposited range is removed



#### parameters
- `removedRange`: range to be removed
