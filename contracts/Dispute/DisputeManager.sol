pragma solidity ^0.5.3;
pragma experimental ABIEncoderV2;

/* Internal Contract Imports */
import "../Utils.sol";
import {DataTypes as types} from "../DataTypes.sol";

/**
 * # Dispute manager contract
 * This contract stores all ongoing dispute games and manages their states.
 * Providing `claim`, `challenge`, `removeChallenge`, `setGameResult` and `settleGame` methods.
 * All methods except `settleGame` must be called with dispute contract meaning only that dispute contract
 * can update the game state.
 * The only responsibility of this contract is to add, update and delete dispute games.
 */
contract DisputeManager {
    uint256 DISPUTE_PERIOD = 7;
    mapping(bytes32 => types.ChallengeGame) private games;
    Utils utils;

    // EVENTS
    event PropertyClaimed(
        bytes32 gameId,
        types.Property property,
        uint256 createdBlock
    );

    event PropertyChallenged(bytes32 gameId, bytes32 challengeGameId);

    event PropertyDecided(bytes32 gameId, bool decision);

    event ChallengeRemoved(bytes32 gameId, bytes32 challengeGameId);

    // MODIFIERS

    /**
     * requires if msg.sender is dispute contract specified in the property's predicateAddress
     */
    modifier onlyFromDisputeContract(types.Property memory _property) {
        require(
            _property.predicateAddress == msg.sender,
            "Method must be called from dispute contract"
        );
        _;
    }

    // METHODS
    constructor(address _utilsAddress) public {
        utils = Utils(_utilsAddress);
    }

    /**
     * Start new dispute game by creating new ChallengeGame instance in games mapping.
     * if same property was claimed before, revert.
     */
    function claim(types.Property memory _property)
        public
        onlyFromDisputeContract(_property)
    {
        bytes32 id = utils.getPropertyId(_property);
        require(!started(id), "game is already started");

        types.ChallengeGame memory game = createGame(id);
        games[id] = game;

        emit PropertyClaimed(id, _property, block.number);
    }

    /**
     * Challenge to an existing game instance by a property.
     * challenge will be added to `challenges` field of challenged game instance.
     * if property does not exist, revert.
     * if challenge with same property was made before, revert.
     */
    function challenge(
        types.Property memory _property,
        types.Property memory _challengeProperty
    ) public onlyFromDisputeContract(_property) {
        // validation
        bytes32 id = utils.getPropertyId(_property);
        require(started(id), "property is not claimed");

        bytes32 challengeGameId = utils.getPropertyId(_challengeProperty);
        require(!started(challengeGameId), "challenge is already started");

        // start challenging game
        types.ChallengeGame memory challengeGame = createGame(challengeGameId);
        games[challengeGameId] = challengeGame;

        // add challenge to challenged game's challenge list
        types.ChallengeGame storage game = games[id];
        game.challenges.push(challengeGameId);

        emit PropertyChallenged(id, challengeGameId);
    }

    /**
     * remove challenge
     * set challenging game decision to false and remove it from challenges field of challenged game
     * if property does not exist, revert.
     * if challenge property does not exist, revert.
     */
    function removeChallenge(
        types.Property memory _property,
        types.Property memory _challengeProperty
    ) public onlyFromDisputeContract(_property) {
        bytes32 id = utils.getPropertyId(_property);
        require(started(id), "property is not claimed");

        bytes32 challengeGameId = utils.getPropertyId(_challengeProperty);
        require(started(challengeGameId), "challenge property is not claimed");

        types.ChallengeGame storage game = games[id];
        int128 challengeIndex = findIndex(game.challenges, challengeGameId);

        require(challengeIndex >= 0, "challenge is not in the challenge list");

        types.ChallengeGame memory challengeGame = games[challengeGameId];
        require(
            challengeGame.decision == types.Decision.False,
            "challenge property is not decided to false"
        );

        removeChallengefromArray(game.challenges, uint256(challengeIndex));
        emit ChallengeRemoved(id, challengeGameId);
    }

    /**
     * set game result to given result value.
     * only called from dispute contract
     */
    function setGameResult(types.Property memory _property, bool result)
        public
        onlyFromDisputeContract(_property)
    {
        bytes32 id = utils.getPropertyId(_property);
        require(started(id), "property is not claimed");

        types.ChallengeGame storage game = games[id];
        require(game.challenges.length == 0, "challenge list is not empty");

        game.decision = getDecision(result);
        emit PropertyDecided(id, result);
    }

    /**
     * settle game
     * settle started game whose dispute period has passed.
     * if no challenge for the property exists, decide to true.
     * if any of its challenges decided to true, decide game to false.
     * if undecided challenge remains, revert.
     */
    function settleGame(types.Property memory _property)
        public
        onlyFromDisputeContract(_property)
        returns (bool)
    {
        bytes32 id = utils.getPropertyId(_property);
        require(started(id), "property is not claimed");

        types.ChallengeGame storage game = games[id];
        require(
            game.createdBlock < block.number - DISPUTE_PERIOD,
            "dispute period has not been passed"
        );

        bool undecidedChallengeExists = false;

        for (uint256 i = 0; i < game.challenges.length; i++) {
            types.Decision decision = getGame(game.challenges[i]).decision;
            if (decision == types.Decision.True) {
                game.decision = types.Decision.False;
                emit PropertyDecided(id, false);
                return false;
            } else if (decision == types.Decision.Undecided) {
                undecidedChallengeExists = true;
            }
        }
        require(!undecidedChallengeExists, "undecided challenge exists");

        game.decision = types.Decision.True;
        emit PropertyDecided(id, true);
        return true;
    }

    function getGame(bytes32 _id)
        public
        view
        returns (types.ChallengeGame memory)
    {
        return games[_id];
    }

    /**
     * If the game can be decided true, isDecidable returns true.
     */
    function isDecidable(bytes32 _id) public view returns (bool) {
        if (started(_id) == false) {
            return false;
        }
        types.ChallengeGame storage game = games[_id];
        if (game.createdBlock > block.number - DISPUTE_PERIOD) {
            return false;
        }

        // check all game.challenges should be false
        for (uint256 i = 0; i < game.challenges.length; i++) {
            types.ChallengeGame memory challengingGame = games[game
                .challenges[i]];
            if (challengingGame.decision != types.Decision.False) {
                return false;
            }
        }
        return true;
    }

    /**
     * check if game of given id is already started
     */
    function started(bytes32 _id) public view returns (bool) {
        return games[_id].createdBlock != 0;
    }

    function isChallengeOf(
        types.Property memory _property,
        types.Property memory _challengeProperty
    ) public view returns (bool) {
        types.ChallengeGame memory game = getGame(
            utils.getPropertyId(_property)
        );
        if (
            findIndex(
                game.challenges,
                utils.getPropertyId(_challengeProperty)
            ) >= 0
        ) {
            return true;
        }
        return false;
    }

    function createGame(bytes32 id)
        private
        view
        returns (types.ChallengeGame memory)
    {
        return
            types.ChallengeGame(
                id,
                new bytes32[](0),
                types.Decision.Undecided,
                block.number
            );
    }

    function getDecision(bool result) private pure returns (types.Decision) {
        if (result) {
            return types.Decision.True;
        } else {
            return types.Decision.False;
        }
    }

    function findIndex(bytes32[] memory array, bytes32 item)
        private
        pure
        returns (int128)
    {
        int128 idx = -1;
        for (uint256 i = 0; i < array.length; i++) {
            if (array[i] == item) {
                idx = int128(i);
            }
        }

        return idx;
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
