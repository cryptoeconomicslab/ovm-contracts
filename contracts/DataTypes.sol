pragma solidity ^0.5.0;
pragma experimental ABIEncoderV2;

contract DataTypes {
  struct Property {
    address predicate;
    bytes input;
  }

  struct Contradiction {
    Property property;
    Property counterProperty;
  }

  struct ClaimStatus {
    Property property;
    uint numProvenContradictions;
    uint decidedAfter; // block number where the claims are decided  
  }

  struct ImplicationProofElement {
    Property implication;
    bytes[] witness;
  }

  struct CheckpointStatus {
    uint256 challengeableUntil;
    uint256 outstandingChallenges;
  }

  struct Challenge {
    types.Checkpoint challengedCheckpoint;
    types.Checkpoint challengingCheckpoint;
  } 
  struct StateObject {
    address predicateAddress;
    bytes data;
  }

  struct Range {
    uint256 start;
    uint256 end;
  }
  struct StateUpdate {
    StateObject stateObject;
    Range range;
    uint256 plasmaBlockNumber;
    address depositAddress;
  }
  struct Checkpoint {
    StateUpdate stateUpdate;
    Range subrange;
    }
}