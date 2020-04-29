pragma solidity ^0.5.3;
pragma experimental ABIEncoderV2;

/* Internal Contract Imports */
import "./Utils.sol";
import {DataTypes as types} from "./DataTypes.sol";
import "./Predicate/AtomicPredicate.sol";
import "./Predicate/LogicalConnective.sol";
import {DecidablePredicate} from "./Predicate/DecidablePredicate.sol";

/**
 * Adjudication Contract is the contract to archive dispute game defined by predicate logic.
 */
contract UniversalAdjudicationContract {
    uint256 DISPUTE_PERIOD = 1;
    mapping(bytes32 => types.ChallengeGame) public instantiatedGames;
    Utils utils;

    event AtomicPropositionDecided(bytes32 gameId, bool decision);
    event NewPropertyClaimed(
        bytes32 gameId,
        types.Property property,
        uint256 createdBlock
    );
    event ClaimChallenged(bytes32 gameId, bytes32 challengeGameId);
    event ClaimDecided(bytes32 gameId, bool decision);
    event ChallengeRemoved(bytes32 gameId, bytes32 challengeGameId);

    constructor(address _utilsAddress) public {
        utils = Utils(_utilsAddress);
    }

    /**
     * @dev Claims property and create new game. Id of game is hash of claimed property
     */
    function claimProperty(types.Property memory _claim) public {
        // get the id of this property
        bytes32 gameId = utils.getPropertyId(_claim);
        // make sure a claim on this property has not already been made
        require(isEmptyClaim(instantiatedGames[gameId]), "claim isn't empty");

        // create the claim status. Always begins with no proven contradictions
        types.ChallengeGame memory newGame = types.ChallengeGame(
            _claim,
            new bytes32[](0),
            types.Decision.Undecided,
            block.number
        );

        // store the claim
        instantiatedGames[gameId] = newGame;
        emit NewPropertyClaimed(gameId, _claim, block.number);
    }

    /**
     * @dev Sets the game decision true when its dispute period has already passed.
     */
    function decideClaimToTrue(bytes32 _gameId) public {
        require(isDecidable(_gameId), "claim should be decidable");
        types.ChallengeGame storage game = instantiatedGames[_gameId];
        // game should be decided true
        game.decision = types.Decision.True;
        emit ClaimDecided(_gameId, true);
    }

    /**
     * @dev Sets the game decision false when its challenge has been evaluated to true.
     */
    function decideClaimToFalse(bytes32 _gameId, bytes32 _challengingGameId)
        public
    {
        types.ChallengeGame storage game = instantiatedGames[_gameId];

        types.ChallengeGame memory challengingGame = instantiatedGames[_challengingGameId];
        // check _challenge is in _game.challenges
        bytes32 challengingGameId = utils.getPropertyId(
            challengingGame.property
        );
        bool isValidChallenge = false;
        for (uint256 i = 0; i < game.challenges.length; i++) {
            if (game.challenges[i] == challengingGameId) {
                isValidChallenge = true;
            }
        }
        require(isValidChallenge, "challenge isn't valid");
        // _game.createdBlock > block.number - dispute
        // check _challenge have been decided true
        require(
            challengingGame.decision == types.Decision.True,
            "challenging game haven't been decided true."
        );
        // game should be decided false
        game.decision = types.Decision.False;
        emit ClaimDecided(_gameId, false);
    }

    /**
     * @dev Decide the game decision with given witness
     */
    function decideClaimWithWitness(bytes32 _gameId, bytes[] memory _witness)
        public
    {
        types.ChallengeGame storage game = instantiatedGames[_gameId];
        require(
            game.decision == types.Decision.Undecided,
            "Decision must be undecided"
        );
        require(game.challenges.length == 0, "There must be no challenge");
        DecidablePredicate property = DecidablePredicate(
            game.property.predicateAddress
        );
        require(
            property.decideWithWitness(game.property.inputs, _witness),
            "property must be true with given witness"
        );

        game.decision = types.Decision.True;
        emit ClaimDecided(_gameId, true);
    }

    /**
     * @dev Removes a challenge when its decision has been evaluated to false.
     */
    function removeChallenge(bytes32 _gameId, bytes32 _challengingGameId)
        public
    {
        types.ChallengeGame storage game = instantiatedGames[_gameId];

        types.ChallengeGame memory challengingGame = instantiatedGames[_challengingGameId];
        // check _challenge is in _game.challenges
        bytes32 challengingGameId = utils.getPropertyId(
            challengingGame.property
        );
        int128 challengeIndex = -1;
        for (uint256 i = 0; i < game.challenges.length; i++) {
            if (game.challenges[i] == challengingGameId) {
                challengeIndex = int128(i);
            }
        }
        require(challengeIndex >= 0, "challenge isn't valid");
        // _game.createdBlock > block.number - dispute
        // check _challenge have been decided true
        require(
            challengingGame.decision == types.Decision.False,
            "challenging game haven't been decided false."
        );
        // remove challenge
        removeChallengefromArray(game.challenges, uint256(challengeIndex));
        emit ChallengeRemoved(_gameId, _challengingGameId);
    }

    function setPredicateDecision(bytes32 _gameId, bool _decision) public {
        types.ChallengeGame storage game = instantiatedGames[_gameId];
        // only the prodicate can decide a claim
        require(
            game.property.predicateAddress == msg.sender,
            "setPredicateDecision must be called from predicate."
        );
        if (_decision) {
            game.decision = types.Decision.True;
        } else {
            game.decision = types.Decision.False;
        }
        emit AtomicPropositionDecided(_gameId, _decision);
    }

    /**
     * @dev challenge a game specified by gameId with a challengingGame specified by _challengingGameId
     * @param _gameId challenged game id
     * @param _challengeInputs array of input to verify child of game tree
     * @param _challengingGameId child of game tree
     */
    function challenge(
        bytes32 _gameId,
        bytes[] memory _challengeInputs,
        bytes32 _challengingGameId
    ) public returns (bool) {
        types.ChallengeGame storage game = instantiatedGames[_gameId];

        types.ChallengeGame memory challengingGame = instantiatedGames[_challengingGameId];
        require(
            LogicalConnective(game.property.predicateAddress).isValidChallenge(
                game.property.inputs,
                _challengeInputs,
                challengingGame.property
            ),
            "_challenge isn't valid"
        );
        game.challenges.push(_challengingGameId);
        emit ClaimChallenged(_gameId, _challengingGameId);
        return true;
    }

    /* Helpers */
    function isWhiteListedProperty(types.Property memory _property)
        private
        returns (bool)
    {
        return true; // Always return true until we know what to whitelist
    }

    function isDecided(types.Property memory _property)
        public
        view
        returns (bool)
    {
        return
            instantiatedGames[utils.getPropertyId(_property)].decision ==
            types.Decision.True;
    }

    function isDecidable(bytes32 _propertyId) public view returns (bool) {
        types.ChallengeGame storage game = instantiatedGames[_propertyId];
        if (game.createdBlock > block.number - DISPUTE_PERIOD) {
            return false;
        }

        // check all _game.challenges should be false
        for (uint256 i = 0; i < game.challenges.length; i++) {
            types.ChallengeGame memory challengingGame = instantiatedGames[game
                .challenges[i]];
            if (challengingGame.decision != types.Decision.False) {
                return false;
            }
        }
        return true;
    }

    function isDecidedById(bytes32 _propertyId) public view returns (bool) {
        return instantiatedGames[_propertyId].decision == types.Decision.True;
    }

    function getGame(bytes32 claimId)
        public
        view
        returns (types.ChallengeGame memory)
    {
        return instantiatedGames[claimId];
    }

    function getPropertyId(types.Property memory _property)
        public
        view
        returns (bytes32)
    {
        return utils.getPropertyId(_property);
    }

    function isEmptyClaim(types.ChallengeGame memory _game)
        internal
        pure
        returns (bool)
    {
        return _game.createdBlock == 0;
    }

    function removeChallengefromArray(
        bytes32[] storage challenges,
        uint256 index
    ) private {
        require(
            index < challenges.length,
            "index must be less than challenges.length"
        );
        for (uint256 i = index; i < challenges.length - 1; i++) {
            challenges[i] = challenges[i + 1];
        }
        delete challenges[challenges.length - 1];
        challenges.length -= 1;
    }
}
