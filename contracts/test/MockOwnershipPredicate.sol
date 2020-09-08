pragma solidity ^0.5.0;
pragma experimental ABIEncoderV2;

import {DataTypes as types} from "../DataTypes.sol";
import "../Predicate/CompiledPredicate.sol";
import "../DepositContract.sol";

/**
 * @title MockOwnershipPredicate
 * @notice Mock of compiled ownership predicate
 */
contract MockOwnershipPredicate is CompiledPredicate {
    address public depositContractAddress;
    address public payoutContractAddress = address(this);

    constructor(address _depositContractAddress) public {
        depositContractAddress = _depositContractAddress;
    }

    function setPayoutContractAddress(address _payoutContractAddress) public {
        payoutContractAddress = _payoutContractAddress;
    }

    function isValidChallenge(
        bytes[] memory _inputs,
        bytes[] memory _challengeInputs,
        types.Property memory _challenge
    ) public view returns (bool) {
        return true;
    }

    function decide(bytes[] memory _inputs, bytes[] memory _witness)
        public
        view
        returns (bool)
    {
        return true;
    }

    function decideTrue(bytes[] memory _inputs, bytes[] memory _witness)
        public
    {}

    function finalizeExit(
        types.StateUpdate memory _exit,
        uint256 _depositedRangeId
    ) public {
        DepositContract(depositContractAddress).finalizeExit(
            _exit,
            _depositedRangeId
        );
    }

    function finalizeBatchExit(
        types.StateUpdate[] memory _exits,
        uint256 _depositedRangeId
    ) public {
        DepositContract(depositContractAddress).finalizeBatchExit(
            _exits,
            _depositedRangeId
        );
    }

    function decideWithWitness(bytes[] memory _inputs, bytes[] memory _witness)
        public
        returns (bool)
    {
        return true;
    }

    function getChild(bytes[] memory inputs, bytes[] memory challengeInput)
        public
        view
        returns (types.Property memory)
    {
        return
            types.Property({predicateAddress: address(this), inputs: inputs});
    }

    function packTypes() public pure returns (bytes memory) {
        return abi.encodePacked("address owner");
    }

    function packValues(bytes[] memory _inputs)
        public
        pure
        returns (bytes memory)
    {
        address owner = abi.decode(_inputs[0], (address));
        return abi.encodePacked(owner);
    }
}
