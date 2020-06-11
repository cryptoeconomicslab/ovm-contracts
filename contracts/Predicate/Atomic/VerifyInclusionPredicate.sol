pragma solidity ^0.5.0;
pragma experimental ABIEncoderV2;

import {DataTypes as types} from "../../DataTypes.sol";
import "./BaseAtomicPredicate.sol";
import "../../Verify.sol";

contract VerifyInclusionPredicate is BaseAtomicPredicate {
    Verify verify;

    constructor(
        address _uacAddress,
        address _utilsAddress,
        address _verify
    ) public BaseAtomicPredicate(_uacAddress, _utilsAddress) {
        verify = Verify(_verify);
    }

    function decide(bytes[] memory _inputs) public view returns (bool) {
        return
            verify.verifyInclusionWithRoot(
                keccak256(_inputs[0]),
                utils.bytesToAddress(_inputs[1]),
                abi.decode(_inputs[2], (types.Range)),
                abi.decode(_inputs[3], (types.InclusionProof)),
                abi.decode(_inputs[4], (bytes32))
            );
    }
}
