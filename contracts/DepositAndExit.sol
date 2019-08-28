pragma solidity ^0.5.0;
pragma experimental ABIEncoderV2;

/* Internal Imports */
import {DataTypes as types} from "./DataTypes.sol";
import {CommitmentContract} from "./CommitmentContract.sol";

contract DepostiAndExit {
  function deposit(uint256 _amount, types.StateObject memory _initialState) public {

  }
  function extendDepositedRanges(uint256 _amount) public {
    
  } 
  function removeDepositedRange(types.Range memory range, uint256 depositedRangeId) public {
      
  }
  function startCheckpoint(
    types.Checkpoint memory _checkpoint,
    bytes memory _inclusionProof,
    uint256 _depositedRangeId
    ) public {
  }
  function startExit(types.Checkpoint memory _checkpoint) public {
  }
  function finalizeExit(types.Checkpoint memory _exit, uint256 depositedRangeId) public {
  
　}
　function deprecateExit(types.Checkpoint memory _exit) public {
       
  }
  function challengeCheckpoint(types.Challenge memory _challenge) public {
  }

  function removeChallenge(types.Challenge memory _challenge) public {

  }
}