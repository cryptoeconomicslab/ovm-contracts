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
}