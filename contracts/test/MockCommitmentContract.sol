pragma solidity ^0.5.0;
pragma experimental ABIEncoderV2;

import {DataTypes as types} from "../DataTypes.sol";

/**
 * @title MockCommitmentContract
 * @notice This is mock commitment contract
 */
contract MockCommitmentContract {
    uint256 public currentBlock = 100;
    function verifyInclusion(
        bytes32 _leaf,
        address _tokenAddress,
        types.Range memory _range,
        types.InclusionProof memory _inclusionProof,
        uint256 _blkNumber
    ) public pure returns (bool) {
        return true;
    }
}
