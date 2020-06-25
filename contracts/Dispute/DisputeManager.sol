pragma solidity ^0.5.3;
pragma experimental ABIEncoderV2;

/* Internal Contract Imports */
import "../Utils.sol";
import {DataTypes as types} from "../DataTypes.sol";
import {Dispute} from "./DisputeInterface.sol";

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
    mapping(bytes32 => types.ChallengeGame) public games;
    Utils utils;

    // EVENTS
    event NewPropertyClaimed(
        bytes32 gameId,
        types.Property property,
        uint256 createdBlock
    );

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

    function claim(types.Property memory _property)
        public
        onlyFromDisputeContract(_property)
    {
        bytes32 id = utils.getPropertyId(_property);
        require(!started(id), "game is already started");

        types.ChallengeGame memory game = types.ChallengeGame(
            id,
            new bytes32[](0),
            types.Decision.Undecided,
            block.number
        );
        games[id] = game;

        emit NewPropertyClaimed(id, _property, block.number);
    }

    function challenge(
        types.Property memory _property,
        types.Property memory _challengeProperty
    ) public onlyFromDisputeContract(_property) {
        // TODO: update game to add challenge
        // TODO: add challengeProperty as a new game
        // TODO: emit event
    }

    function removeChallenge(
        types.Property memory _property,
        types.Property memory _challengeProperty
    ) public onlyFromDisputeContract(_property) {
        // TODO: set challenging game decision to false
        // TODO: remove challenge from game
    }

    function setGameResult(types.Property memory _property, bool result)
        public
        onlyFromDisputeContract(_property)
    {
        // TODO: check if game is started
        // TODO: check if challenge is empty
        // TODO: set decision
        // TODO: emit event
    }

    function settleGame(types.Property memory _property) public {
        // TODO: check if dispute period have been passed
        // TODO: check if challenge is empty
        // TODO: set decision to True
        // TODO: emit event
    }

    /**
     * check if game of given id is already started
     */
    function started(bytes32 _id) internal view returns (bool) {
        return games[_id].createdBlock != 0;
    }
}
