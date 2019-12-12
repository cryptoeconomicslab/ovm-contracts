pragma solidity ^0.5.0;
pragma experimental ABIEncoderV2;

library DataTypes {
    struct Property {
        address predicateAddress;
        // Every inputs are bytes. Each Atomic Predicate decode inputs to the specific type.
        bytes[] inputs;
    }

    enum Decision {Undecided, True, False}

    struct ChallengeGame {
        Property property;
        bytes32[] challenges;
        Decision decision;
        uint256 createdBlock;
    }

    struct Range {
        uint256 start;
        uint256 end;
    }
    struct StateUpdate {
        uint256 blockNumber;
        address depositAddress;
        Range range;
        Property stateObject;
    }
    struct Checkpoint {
        Range subrange;
        Property stateUpdate;
    }
    struct Exit {
        Range subrange;
        StateUpdate stateUpdate;
    }

    struct InclusionProof {
        IntervalInclusionProof intervalInclusionProof;
        AddressInclusionProof addressInclusionProof;
    }

    struct IntervalInclusionProof {
        uint256 leafPosition;
        uint256 leafStart;
        IntervalTreeNode[] siblings;
    }

    struct AddressInclusionProof {
        uint256 leafPosition;
        AddressTreeNode[] siblings;
    }

    struct IntervalTreeNode {
        bytes32 data;
        uint256 start;
    }

    struct AddressTreeNode {
        bytes32 data;
        address tokenAddress;
    }
}
