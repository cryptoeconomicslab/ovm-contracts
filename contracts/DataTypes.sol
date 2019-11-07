pragma solidity ^0.5.0;
pragma experimental ABIEncoderV2;

library DataTypes {
    struct Property {
        address predicateAddress;
        // Every inputs are bytes. Each Atomic Predicate decode inputs to the specific type.
        bytes[] inputs;
    }

    enum Decision {
        Undecided,
        True,
        False
    }

    struct ChallengeGame {
        Property property;
        bytes32[] challenges;
        Decision decision;
        uint createdBlock;
    }

    struct Challenge {
        bytes challengeInput;
        Property challengeProperty;
    }

    struct Range {
        uint256 start;
        uint256 end;
    }
    struct StateUpdate {
        Property property;
        Range range;
        uint256 plasmaBlockNumber;
        address depositAddress;
    }
    struct Checkpoint {
        StateUpdate stateUpdate;
        Range subrange;
    }
}