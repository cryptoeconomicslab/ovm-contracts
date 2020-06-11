## `AndPredicate`






### `constructor(address _uacAddress, address _notPredicateAddress, address utilsAddress)` (public)





### `createPropertyFromInput(bytes[] _input) → struct DataTypes.Property` (public)





### `isValidChallenge(bytes[] _inputs, bytes[] _challengeInputs, struct DataTypes.Property _challnge) → bool` (external)



Validates a child node of And property in game tree.

### `decideTrue(struct DataTypes.Property[] innerProperties)` (public)



Can decide true when all child properties are decided true

### `decideWithWitness(bytes[] _inputs, bytes[] _witness) → bool` (public)






