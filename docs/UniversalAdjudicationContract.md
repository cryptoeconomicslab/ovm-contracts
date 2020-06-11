## `UniversalAdjudicationContract`
UniversalAdjudicationContract is a contract to execute dispute game following optimistic game semantics.


### `isInitiated(struct DataTypes.Property property)`


checks if property claim is already initiated

#### parameters
- `property`: Property to be checked
### `constructor(address _utilsAddress)` (public)



#### parameters
### `claimProperty(struct DataTypes.Property _claim)` (public)
Claims property to start new dispute game



#### parameters
- `_claim`: property to be claimed
### `decideClaimToTrue(bytes32 _gameId)` (public)
this method is used to fix the claim decision to be true.


Sets the game decision true when its dispute period has already passed.

#### parameters
- `_gameId`: Hash of a claimed property
### `decideClaimToFalse(struct DataTypes.Property _property, struct DataTypes.Property _challengingProperty)` (public)
this method is used to fix the claim decision to be false.


Sets the game decision false when its challenge has been evaluated to true.

#### parameters
- `_property`: property to be decided to be false

- `_challengingProperty`: counter property to be contradiction of the property
### `decideClaimWithWitness(struct DataTypes.Property _property, bytes[] _witness)` (public)
this method is used to decide a given property to be true or false using witness
the game should be already initiated and not decided beforehand. Emit ClaimDecided event when decision can be made.



#### parameters
- `_property`: property to be decided

- `_witness`: array of bytes which used to decide the property. witness should follow the rule corresponding to the property
### `removeChallenge(struct DataTypes.Property _property, struct DataTypes.Property _challengingProperty)` (public)
this method is used to remove invalid challenge for a property
Removes a challenge when its decision has been evaluated to false.



#### parameters
- `_property`: property which is invalidly challenged

- `_challengingProperty`: challenging property which will be removed
### `setPredicateDecision(struct DataTypes.Property _property, bool _decision)` (public)
this method is used to set property decision to true or false


this method must be called from predicate contract of the property

#### parameters
- `_property`: property whose decision will be set

- `_decision`: True/False
### `challenge(struct DataTypes.Property _property, bytes[] _challengeInputs, struct DataTypes.Property _challengingProperty) → bool` (public)


challenge a game specified by gameId with a challengingGame specified by _challengingGameId

#### parameters
- `_property`: challenged game id

- `_challengeInputs`: array of input to verify child of game tree

- `_challengingProperty`: child of game tree
### `isDecided(struct DataTypes.Property _property) → bool` (public)



#### parameters
### `isDecidable(bytes32 _propertyId) → bool` (public)



#### parameters
### `isDecidedById(bytes32 _propertyId) → bool` (public)



#### parameters
### `getGame(bytes32 claimId) → struct DataTypes.ChallengeGame` (public)



#### parameters
### `getPropertyId(struct DataTypes.Property _property) → bytes32` (public)



#### parameters
### `isEmptyClaim(struct DataTypes.ChallengeGame _game) → bool` (internal)



#### parameters
### `AtomicPropositionDecided(bytes32 gameId, bool decision)`


Emitted when atomic proposition is decided

#### parameters
- `gameId`: Hash of the property

- `decision`: True/False
### `NewPropertyClaimed(bytes32 gameId, struct DataTypes.Property property, uint256 createdBlock)`


Emitted when new property is claimed

#### parameters
- `gameId`: Hash of the property

- `property`: Property of the claim

- `createdBlock`: Block number when the claim is made
### `ClaimChallenged(bytes32 gameId, bytes32 challengeGameId)`


Emitted when a game is challenged

#### parameters
- `gameId`: Hash of property which is challenged

- `challengeGameId`: Hash of challenging property
### `ClaimDecided(bytes32 gameId, bool decision)`


Emitted when a claim is decided

#### parameters
- `gameId`: hash of property which is decided

- `decision`: True/False
### `ChallengeRemoved(bytes32 gameId, bytes32 challengeGameId)`


Emitted when challenge property is removed

#### parameters
- `gameId`: hash of challenged property

- `challengeGameId`: hash of challenging property
