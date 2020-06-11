## `UniversalAdjudicationContract`

Adjudication Contract is the contract to archive dispute game defined by predicate logic.



### `isInitiated(struct DataTypes.Property property)`






### `constructor(address _utilsAddress)` (public)





### `claimProperty(struct DataTypes.Property _claim)` (public)



Claims property and create new game. Id of game is hash of claimed property

### `decideClaimToTrue(bytes32 _gameId)` (public)



Sets the game decision true when its dispute period has already passed.

### `decideClaimToFalse(struct DataTypes.Property _property, struct DataTypes.Property _challengingProperty)` (public)



Sets the game decision false when its challenge has been evaluated to true.

### `decideClaimWithWitness(struct DataTypes.Property _property, bytes[] _witness)` (public)



Decide the game decision with given witness

### `removeChallenge(struct DataTypes.Property _property, struct DataTypes.Property _challengingProperty)` (public)



Removes a challenge when its decision has been evaluated to false.

### `setPredicateDecision(struct DataTypes.Property _property, bool _decision)` (public)





### `challenge(struct DataTypes.Property _property, bytes[] _challengeInputs, struct DataTypes.Property _challengingProperty) → bool` (public)



challenge a game specified by gameId with a challengingGame specified by _challengingGameId


### `isDecided(struct DataTypes.Property _property) → bool` (public)





### `isDecidable(bytes32 _propertyId) → bool` (public)





### `isDecidedById(bytes32 _propertyId) → bool` (public)





### `getGame(bytes32 claimId) → struct DataTypes.ChallengeGame` (public)





### `getPropertyId(struct DataTypes.Property _property) → bytes32` (public)





### `isEmptyClaim(struct DataTypes.ChallengeGame _game) → bool` (internal)






### `AtomicPropositionDecided(bytes32 gameId, bool decision)`





### `NewPropertyClaimed(bytes32 gameId, struct DataTypes.Property property, uint256 createdBlock)`





### `ClaimChallenged(bytes32 gameId, bytes32 challengeGameId)`





### `ClaimDecided(bytes32 gameId, bool decision)`





### `ChallengeRemoved(bytes32 gameId, bytes32 challengeGameId)`





