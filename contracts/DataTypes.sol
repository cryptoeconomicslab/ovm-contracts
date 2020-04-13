pragma solidity ^0.6.0;
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
        address depositContractAddress;
        Range range;
        uint256 blockNumber;
        Property stateObject;
    }
    struct Checkpoint {
        Property stateUpdate;
    }
    struct Exit {
        StateUpdate stateUpdate;
        InclusionProof inclusionProof;
    }

    struct ExitDeposit {
        StateUpdate stateUpdate;
        Checkpoint checkpoint;
    }

    struct InclusionProof {
        AddressInclusionProof addressInclusionProof;
        IntervalInclusionProof intervalInclusionProof;
    }

    struct IntervalInclusionProof {
        uint256 leafIndex;
        uint256 leafPosition;
        IntervalTreeNode[] siblings;
    }

    struct AddressInclusionProof {
        address leafIndex;
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
