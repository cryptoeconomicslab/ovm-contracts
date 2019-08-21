pragma solidity ^0.5.0;
pragma experimental ABIEncoderV2;

import {DataTypes as types} from "./DataTypes.sol";

library Utils {
  function getPropertyId(types.Property memory _property) public pure returns (bytes32) {
    return keccak256(abi.encodePacked(_property.predicate, _property.input));
  }

  function isEmptyClaim(types.ClaimStatus memory _claimStatus) public pure returns (bool) {
    return _claimStatus.property.predicate == address(0x0)
      && keccak256(_claimStatus.property.input) == keccak256(bytes(""))
      && _claimStatus.decidedAfter == 0
      && _claimStatus.numProvenContradictions == 0;
  }

  function getContradictionId(types.Contradiction memory _contradiction) public pure returns (bytes32) {
    return keccak256(abi.encodePacked(getPropertyId(_contradiction.property), getPropertyId(_contradiction.counterProperty)));
  }

}

