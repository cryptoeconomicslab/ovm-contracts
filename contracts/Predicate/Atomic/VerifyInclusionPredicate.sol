pragma solidity ^0.5.0;
pragma experimental ABIEncoderV2;

import {DataTypes as types} from "../../DataTypes.sol";
import "./BaseAtomicPredicate.sol";
import "../../VerifyCommitmentData.sol";

contract VerifyInclusionPredicate is BaseAtomicPredicate {
    VerifyCommitmentData verifyCommitmentData;

    constructor(
        address _uacAddress,
        address _utilsAddress,
        address _verifyCommitmentData
    ) public BaseAtomicPredicate(_uacAddress, _utilsAddress) {
        verifyCommitmentData = VerifyCommitmentData(_verifyCommitmentData);
    }

    function decide(bytes[] memory _inputs) public view returns (bool) {
        return
            verifyCommitmentData.verifyInclusionWithRoot(
                keccak256(_inputs[0]),
                utils.bytesToAddress(_inputs[1]),
                abi.decode(_inputs[2], (types.Range)),
                abi.decode(_inputs[3], (types.InclusionProof)),
                abi.decode(_inputs[4], (bytes32))
            );
    }
}
