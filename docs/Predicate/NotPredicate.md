## `NotPredicate`






### `constructor(address _uacAddress, address utilsAddress)` (public)





### `createPropertyFromInput(bytes[] _input) → struct DataTypes.Property` (public)





### `isValidChallenge(bytes[] _inputs, bytes[] _challengeInputs, struct DataTypes.Property _challenge) → bool` (external)



Validates a child node of Not property in game tree.

### `decideTrue(struct DataTypes.Property innerProperty)` (public)



Decides true

### `decideWithWitness(bytes[] _inputs, bytes[] _witness) → bool` (public)






### `ValueDecided(bool decision, struct DataTypes.Property innerProperty)`





