## `CompiledPredicate`


Compiled predicate interface. Predicates compiled from predicate DSL implement this interface
### `payoutContractAddress() → address` (external)


this method should return corresponding payout contract address
#### parameters
### `isValidChallenge(bytes[] _inputs, bytes[] _challengeInputs, struct DataTypes.Property _challenge) → bool` (external)


this method should implement a logic to tell if certain input array is valid challenge input of
a property

#### parameters
- `_inputs`: challenged input

- `_challengeInputs`: challenging input

- `_challenge`: challenging property
### `getChild(bytes[] inputs, bytes[] challengeInput) → struct DataTypes.Property` (external)


get valid child property of game tree with challengeInputs
#### parameters
### `decide(bytes[] _inputs, bytes[] _witness) → bool` (external)



#### parameters
### `decideTrue(bytes[] _inputs, bytes[] _witness)` (external)



#### parameters
### `decideWithWitness(bytes[] _inputs, bytes[] _witness) → bool` (external)



#### parameters
