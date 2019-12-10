pragma solidity ^0.5.3;
pragma experimental ABIEncoderV2;

/* Internal Contract Imports */
import "./Utils.sol";
import {DataTypes as types} from "./DataTypes.sol";
import "./Predicate/AtomicPredicate.sol";
import "./Predicate/LogicalConnective.sol";

contract UniversalAdjudicationContract {

    uint DISPUTE_PERIOD = 7;
    mapping (bytes32 => types.ChallengeGame) public instantiatedGames;
    mapping (bytes32 => bool) contradictions;
    enum RemainingClaimIndex {Property, CounterProperty}
    Utils utils;

    event AtomicPropositionDecided(bytes32 gameId, bool decision);

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
        types.ChallengeGame memory newGame = types.ChallengeGame(_claim, new bytes32[](0), types.Decision.Undecided, block.number);

        // store the claim
        instantiatedGames[gameId] = newGame;
    }

    function decideClaimToTrue(bytes32 _gameId) public {
        types.ChallengeGame storage game = instantiatedGames[_gameId];
        // check all _game.challenges should be false
        for (uint256 i = 0;i < game.challenges.length; i++) {
            types.ChallengeGame memory challengingGame = instantiatedGames[game.challenges[i]];
            require(challengingGame.decision == types.Decision.False, "all _game.challenges must be false");
        }
        // should check dispute period
        require(game.createdBlock < block.number - DISPUTE_PERIOD, "Dispute period haven't passed yet.");
        // game should be decided true
        game.decision = types.Decision.True;
    }

    function decideClaimToFalse(
        bytes32 _gameId,
        bytes32 _challengingGameId
    ) public {
        types.ChallengeGame storage game = instantiatedGames[_gameId];
        types.ChallengeGame memory challengingGame = instantiatedGames[_challengingGameId];
        // check _challenge is in _game.challenges
        bytes32 challengingGameId = utils.getPropertyId(challengingGame.property);
        bool isValidChallenge = false;
        for (uint256 i = 0;i < game.challenges.length; i++) {
            if(game.challenges[i] == challengingGameId) {
                isValidChallenge = true;
            }
        }
        require(isValidChallenge, "challenge isn't valid");
        // _game.createdBlock > block.number - dispute
        // check _challenge have been decided true
        require(challengingGame.decision == types.Decision.True, "challenging game haven't been decided true.");
        // game should be decided false
        game.decision = types.Decision.False;
    }

    function removeChallenge(
        bytes32 _gameId,
        bytes32 _challengingGameId
    ) public {
        types.ChallengeGame storage game = instantiatedGames[_gameId];
        types.ChallengeGame memory challengingGame = instantiatedGames[_challengingGameId];
        // check _challenge is in _game.challenges
        bytes32 challengingGameId = utils.getPropertyId(challengingGame.property);
        int128 challengeIndex = -1;
        for (uint256 i = 0;i < game.challenges.length; i++) {
            if(game.challenges[i] == challengingGameId) {
                challengeIndex = int128(i);
            }
        }
        require(challengeIndex >= 0, "challenge isn't valid");
        // _game.createdBlock > block.number - dispute
        // check _challenge have been decided true
        require(challengingGame.decision == types.Decision.False, "challenging game haven't been decided false.");
        // remove challenge
        removeChallengefromArray(game.challenges, uint256(challengeIndex));
    }

    function setPredicateDecision(bytes32 _gameId, bool _decision) public {
        types.ChallengeGame storage game = instantiatedGames[_gameId];
        // only the prodicate can decide a claim
        require(game.property.predicateAddress == msg.sender, "setPredicateDecision must be called from predicate.");
        if (_decision) {
            game.decision = types.Decision.True;
        } else {
            game.decision = types.Decision.False;
        }
        emit AtomicPropositionDecided(_gameId, _decision);
    }

    /**
     * @dev challenge a game specified by gameId with a challengingGame specified by _challengingGameId
     */
    function challenge(
        bytes32 _gameId,
        types.Challenge[] memory _challenges,
        bytes32 _challengingGameId
    ) public returns (bool) {
        types.ChallengeGame storage game = instantiatedGames[_gameId];
        require(_challenges.length % 2 == 1, "a number of challenges must be odd");
        require(verifyChildOfGameTree(game.property, _challenges, _challengingGameId, 1), "_challengingGameId must be valid child of game tree");
        game.challenges.push(_challengingGameId);
        return true;
    }

    function makeTrueDecisionFromTrueGame(
        bytes32 _gameId,
        types.Challenge[] memory _challenges,
        bytes32 _conditionGameId
    ) public {
        types.ChallengeGame storage game = instantiatedGames[_gameId];
        types.ChallengeGame memory conditionGame = instantiatedGames[_conditionGameId];
        require(_challenges.length % 2 == 0, "a number of challenges must be even");
        require(verifyChildOfGameTree(game.property, _challenges, _conditionGameId, 0), "_conditionGameId must be valid child of game tree");
        require(conditionGame.decision == types.Decision.True, "condition property must be true");
        game.decision = types.Decision.True;
    }

    function verifyChildOfGameTree(
        types.Property memory firstProperty,
        types.Challenge[] memory challenges,
        bytes32 challengingGameId,
        uint256 isChallenge
    ) private view returns (bool) {
        require(
            LogicalConnective(firstProperty.predicateAddress).isValidChallenge(
                firstProperty.inputs,
                challenges[0].challengeInput,
                challenges[0].challengeProperty
            ),
            "The first item of challenges must be valid challenge of gameId"
        );
        require(
            challengingGameId == utils.getPropertyId(challenges[challenges.length - 1].challengeProperty),
            "The last item of challenges must be challengingGameId"
        );
        // check left challenges
        for(uint i = 0;i < challenges.length - 1;i++) {
            // Counter parties' turn can be skipped if challenge.challengeInput is empty.
            if(i % 2 == 0) {
                require(
                    keccak256(challenges[i + isChallenge].challengeInput) == keccak256(abi.encodePacked(byte(0))),
                    "challengeInput must be empty"
                );
            }
            require(
                LogicalConnective(challenges[i].challengeProperty.predicateAddress).isValidChallenge(
                    challenges[i].challengeProperty.inputs,
                    challenges[i + 1].challengeInput,
                    challenges[i + 1].challengeProperty
                ),
                "_challenge[i] isn't valid"
            );
        }
        return true;
    }

    /* Helpers */
    function isWhiteListedProperty(types.Property memory _property) private returns (bool) {
        return true; // Always return true until we know what to whitelist
    }

    function isDecided(types.Property memory _property) public returns (bool) {
        return instantiatedGames[utils.getPropertyId(_property)].decision == types.Decision.True;
    }

    function isDecidedById(bytes32 _propertyId) public view returns (bool) {
        return instantiatedGames[_propertyId].decision == types.Decision.True;
    }

    function getGame(bytes32 claimId) public view returns (types.ChallengeGame memory) {
        return instantiatedGames[claimId];
    }

    function getPropertyId(types.Property memory _property) public view returns (bytes32) {
        return utils.getPropertyId(_property);
    }

    function isEmptyClaim(types.ChallengeGame memory _game) internal pure returns (bool) {
        return _game.createdBlock == 0;
    }

    function removeChallengefromArray(bytes32[] storage challenges, uint256 index) private {
        require(index < challenges.length, "index must be less than challenges.length");
        for (uint256 i = index; i < challenges.length - 1; i++){
            challenges[i] = challenges[i+1];
        }
        delete challenges[challenges.length - 1];
        challenges.length -= 1;
    }
}
