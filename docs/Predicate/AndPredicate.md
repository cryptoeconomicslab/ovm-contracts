## `AndPredicate`



### `constructor(address _uacAddress, address _notPredicateAddress, address utilsAddress)` (public)



#### parameters
### `createPropertyFromInput(bytes[] _input) → struct DataTypes.Property` (public)



#### parameters
### `isValidChallenge(bytes[] _inputs, bytes[] _challengeInputs, struct DataTypes.Property _challnge) → bool` (external)


Validates a child node of And property in game tree.
#### parameters
### `decideTrue(struct DataTypes.Property[] innerProperties)` (public)


Can decide true when all child properties are decided true
#### parameters
### `decideWithWitness(bytes[] _inputs, bytes[] _witness) → bool` (public)



#### parameters
