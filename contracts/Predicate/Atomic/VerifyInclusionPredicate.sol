pragma solidity ^0.5.0;
pragma experimental ABIEncoderV2;

import {DataTypes as types} from "../../DataTypes.sol";
import "../AtomicPredicate.sol";
import {
    UniversalAdjudicationContract
} from "../../UniversalAdjudicationContract.sol";
import "../../Utils.sol";
import "../../CommitmentContract.sol";

contract VerifyInclusionPredicate is AtomicPredicate {
    address uacAddress;
    Utils utils;
    CommitmentContract commitmentContract;

    constructor(
        address _uacAddress,
        address _utilsAddress,
        address _commitmentContract
    ) public {
        uacAddress = _uacAddress;
        utils = Utils(_utilsAddress);
        commitmentContract = CommitmentContract(_commitmentContract);
    }

    function decide(bytes[] memory _inputs) public view returns (bool) {
        return
            commitmentContract.verifyInclusion(
                keccak256(_inputs[0]),
                utils.bytesToAddress(_inputs[1]),
                abi.decode(_inputs[2], (types.Range)),
                abi.decode(_inputs[3], (types.InclusionProof)),
                abi.decode(_inputs[4], (uint256))
            );
    }

    function decideTrue(bytes[] memory _inputs) public {
        require(decide(_inputs), "must decide true");
        types.Property memory property = types.Property({
            predicateAddress: address(this),
            inputs: _inputs
        });
        UniversalAdjudicationContract(uacAddress).setPredicateDecision(
            utils.getPropertyId(property),
            true
        );
    }
}
