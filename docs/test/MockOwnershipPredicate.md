## `MockOwnershipPredicate`

Mock of compiled ownership predicate




### `constructor(address _depositContractAddress)` (public)





### `setPayoutContractAddress(address _payoutContractAddress)` (public)





### `isValidChallenge(bytes[] _inputs, bytes[] _challengeInputs, struct DataTypes.Property _challenge) → bool` (public)





### `decide(bytes[] _inputs, bytes[] _witness) → bool` (public)





### `decideTrue(bytes[] _inputs, bytes[] _witness)` (public)





### `finalizeExit(struct DataTypes.Property _exitProperty, uint256 _depositedRangeId)` (public)





### `decideWithWitness(bytes[] _inputs, bytes[] _witness) → bool` (public)





### `getChild(bytes[] inputs, bytes[] challengeInput) → struct DataTypes.Property` (public)






