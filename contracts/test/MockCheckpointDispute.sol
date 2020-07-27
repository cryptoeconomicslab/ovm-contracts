pragma solidity ^0.5.0;
pragma experimental ABIEncoderV2;

import {DataTypes as types} from "../DataTypes.sol";
import {DepositContract} from "../DepositContract.sol";
import "../Library/Deserializer.sol";

contract MockCheckpointDispute {
    event SomeEvent();

    function claim(bytes[] memory _inputs, bytes[] memory _witness) public {}

    function challenge(
        bytes[] memory _inputs,
        bytes[] memory _challengeInputs,
        bytes[] memory _witness
    ) public {}

    function removeChallenge(
        bytes[] memory _inputs,
        bytes[] memory _challengeInputs,
        bytes[] memory _witness
    ) public {}

    function settle(bytes[] memory _inputs) public {
        types.StateUpdate memory stateUpdate = abi.decode(
            _inputs[0],
            (types.StateUpdate)
        );
        DepositContract depositContract = DepositContract(
            stateUpdate.depositContractAddress
        );
        depositContract.finalizeCheckpoint(stateUpdate);
    }
}
