pragma solidity ^0.5.0;
pragma experimental ABIEncoderV2;

/* internal contract imports */
import "./Utils.sol";
import {DataTypes as types} from "./DataTypes.sol";

contract Predicate {
  function verifyImplication(bytes memory, types.ImplicationProofElement memory) public returns (bool) {}
  function verifyContradiction(types.Property memory, types.Property memory, bytes memory) public returns (bool) {}
}

contract UniversalDecisionContract {
  uint DISPUTE_PERIOD = 7;
  mapping(bytes32 => types.ClaimStatus) public claims;
  mapping(bytes32 => bool) contradictions;
  enum RemainingClaimIndex { Property, CounterProperty }

  function isWhiteListedProperty(types.Property memory _property) private returns (bool) {
    // Always return true until we know what to whitelist 
    return true;
    }

  function isDecided(types.Property memory _property) private returns (bool) {
    return claims[Utils.getPropertyId(_property)].decidedAfter < block.number;
  }  

  function getClaim(bytes32 claimId) public view returns (types.Property memory) {
    return claims[claimId].property;
  }

  function getPropertyId(types.Property memory _property) public view returns (bytes32) {
    return Utils.getPropertyId(_property);
  }

  function claimProperty(types.Property memory _claim) public {
    // get the id of this property
    bytes32 claimedPropertyId = Utils.getPropertyId(_claim);
    
    // make sure a claim on this property has not already been made
    require(Utils.isEmptyClaim(claims[claimedPropertyId]));

    // create the claim status. Always begins with no proven contradictions
    types.ClaimStatus memory status = types.ClaimStatus(_claim, 0, block.number + DISPUTE_PERIOD);

    // store the claim
    claims[claimedPropertyId] = status;
  }

  function decideProperty(types.Property memory _property, bool _decision) public {
    // only the prodicate can decide a claim 
    require(msg.sender == _property.predicate);
    bytes32 decidedPropertyId = Utils.getPropertyId(_property);

    v// if the decision is true, automatically decide its claim now 
    if (_decision) {
        claims[decidedPropertyId].decidedAfter = block.number - 1;
    } else {
      // when decision is false -- delete its claim (all fields with this key got initialized)
      delete claims[decidedPropertyId];
    }
  }

  function verifyImplicationProof(
    types.Property memory _rootPremise,
    types.ImplicationProofElement[] memory _implicationProof
  ) public returns (bool) {
    if (_implicationProof.length == 1) {
        // properties are always implications of themselves 
        return _rootPremise.predicate == _implicationProof[0].implication.predicate
            && keccak256(_rootPremise.input) == keccak256(_implicationProof[0].implication.input);    
    }
    // check the first implication (i.e. with the rootPremise)
    require(isWhiteListedProperty(_rootPremise)); // make sure all properties are on the whitelist 
    require(Predicate(_rootPremise.predicate).verifyImplication(_rootPremise.input, _implicationProof[1])); 
    for (uint i = 0; i < _implicationProof.length -1; i++) {
        types.Property memory premise = _implicationProof[i].implication;
        types.ImplicationProofElement memory implication = _implicationProof[i+1];
        require(isWhiteListedProperty(premise));

        // if this is the implication's conclusion property, also check that it is in fact whitelisted 
        if (i == _implicationProof.length - 1) {
            require(isWhiteListedProperty(_implicationProof[i].implication));
        }
        require(Predicate(premise.predicate).verifyImplication(premise.input, implication));
    }
  }

  function verifyContradictingImplications(
    types.Property memory _root1,
    types.ImplicationProofElement[] memory _implicationProof1,
    types.Property memory _root2,
    types.ImplicationProofElement[] memory _implicationProof2,
    bytes memory _contradictionWitness
  ) public returns (bool) {
    require(verifyImplicationProof(_root1, _implicationProof1));
    require(verifyImplicationProof(_root2, _implicationProof2));
    types.Property memory implication1 = _implicationProof1[_implicationProof1.length - 1].implication;
    types.Property memory implication2 = _implicationProof2[_implicationProof2.length - 1].implication;
    require(Predicate(implication1.predicate).verifyContradiction(implication1, implication2, _contradictionWitness));
  }

  function proveClaimContradictsDecision(
    types.Property memory _decidedProperty,
    types.ImplicationProofElement[] memory _decidedImplicationProof,
    types.Property memory _contradictingClaim,
    types.ImplicationProofElement[] memory _contradictionImplicationProof,
    bytes memory _contradictionWitness
  ) public {
    bytes32 contraditingClaimId = Utils.getPropertyId(_contradictingClaim);

    // make sure the decided property is already decided before the current block number 
    require(isDecided(_decidedProperty));
    // make sure the two properties contradict one another 
    require(verifyContradictingImplications(_decidedProperty, _decidedImplicationProof, _contradictingClaim, _contradictionImplicationProof, _contradictionWitness));
    // delete the contradicting claim
    delete claims[contraditingClaimId]; 
  }

  function proveUndecidedContradiction(
    types.Contradiction memory _contradiction,
    types.ImplicationProofElement[] memory _implicationProof0,
    types.ImplicationProofElement[] memory _implicationProof1,
    bytes memory _contradictionWitness
  ) public {
    // get the unique ID corresponding to this contradiction
    bytes32 contradictionId = Utils.getContradictionId(_contradiction);
    bytes32[2] memory propertyIds = [Utils.getPropertyId(_contradiction.property), Utils.getPropertyId(_contradiction.counterProperty)];

    // make sure both cliams have been made and not decided false 
    require(!Utils.isEmptyClaim(claims[propertyIds[0]]) && !Utils.isEmptyClaim(claims[propertyIds[1]]));

    // make sure the contradicting properties have contradicting implications
    require(verifyContradictingImplications(_contradiction.property, _implicationProof0, _contradiction.counterProperty, _implicationProof1, _contradictionWitness));

    // increment the number of contradictions
    claims[propertyIds[0]].numProvenContradictions += 1;
    claims[propertyIds[1]].numProvenContradictions += 1;

    // store the unresolved contradiction
    contradictions[contradictionId] = true;
  }

  function removeContradiction(
    types.Contradiction memory _contradiction,
    RemainingClaimIndex _remainingClaimIndex // 0:xxx 1:xxx 
  ) public {
    bytes32 remainingClaimId; 
    bytes32 falsifiedClaimId;
    types.Property memory remainingClaim;
    types.Property memory falsifiedClaim;

    // get the claims and their Ids when property is the true one 
    if (RemainingClaimIndex.Property == _remainingClaimIndex) {
        remainingClaim = _contradiction.property;
        falsifiedClaim = _contradiction.counterProperty;
        falsifiedClaimId = Utils.getPropertyId(falsifiedClaim);
    } else {
        remainingClaim = _contradiction.counterProperty;
        falsifiedClaim = _contradiction.property;
    }
    remainingClaimId = Utils.getPropertyId(remainingClaim);
    falsifiedClaimId = Utils.getPropertyId(falsifiedClaim);

    // get the contradiction Id
    bytes32 contradictionId = Utils.getContradictionId(_contradiction);

    // make sure the falsified claim was decided false
    require(Utils.isEmptyClaim(claims[falsifiedClaimId]));

    // make sure the contradiction is still unresolved
    require(contradictions[contradictionId]);

    // resolve the contradiction
    contradictions[contradictionId] = false;

    // decrement the remaining claim numProvenContradictions
    claims[remainingClaimId].numProvenContradictions -= 1;
  }

}