pragma solidity ^0.5.0;

import {DataTypes as types} from "../DataTypes.sol";
import {DisputeManager} from "./DisputeManager.sol";
import {CommitmentVerifier} from "../CommitmentVerifier.sol";
import {Utils} from "../Utils.sol";

contract DisputeHelper {
    DisputeManager internal disputeManager;
    CommitmentVerifier internal commitmentVerifier;
    Utils internal utils;

    constructor(
        address _disputeManagerAddress,
        address _commitmentVerifierAddress,
        address _utilsAddress
    ) public {
        disputeManager = DisputeManager(_disputeManagerAddress);
        commitmentVerifier = CommitmentVerifier(_commitmentVerifierAddress);
        utils = Utils(_utilsAddress);
    }

    function createProperty(bytes memory suBytes, bytes memory kind)
        internal
        view
        returns (types.Property memory)
    {
        bytes[] memory inputs = new bytes[](2);
        inputs[0] = kind;
        inputs[1] = suBytes;
        return types.Property(address(this), inputs);
    }
}