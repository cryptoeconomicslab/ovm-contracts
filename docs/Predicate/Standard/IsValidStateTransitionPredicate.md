## `IsValidStateTransitionPredicate`
IsValidStateTransitionPredicate stands for the claim below.
def IsValidStateTransition(prev_su, tx, su) :=
eq(tx.adderss, Tx.address)
and eq(tx.0, prev_su.0)
and within(tx.1, prev_su.1)
and eq(tx.2, prev_su.2)
and eq(tx.3, su.3)


### `constructor(address _uacAddress, address _utilsAddress, address _txAddress, address _isContainedPredicateAddress)` (public)



#### parameters
### `decide(bytes[] _inputs) → bool` (public)



#### parameters
### `decideTrue(bytes[] _inputs)` (public)



#### parameters
