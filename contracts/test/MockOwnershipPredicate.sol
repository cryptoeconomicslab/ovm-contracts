pragma solidity ^0.6.0;
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
    address public override payoutContractAddress = address(this);

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
    ) public view override returns (bool) {
        return true;
    }

    function decide(bytes[] memory _inputs, bytes[] memory _witness)
        public
        view
        override
        returns (bool)
    {
        return true;
    }

    function decideTrue(bytes[] memory _inputs, bytes[] memory _witness)
        public
        override
    {}

    function finalizeExit(
        types.Property memory _exitProperty,
        uint256 _depositedRangeId
    ) public {
        DepositContract(depositContractAddress).finalizeExit(
            _exitProperty,
            _depositedRangeId
        );
    }

    function decideWithWitness(bytes[] memory _inputs, bytes[] memory _witness)
        public
        override
        returns (bool)
    {
        return true;
    }

    function getChild(bytes[] memory inputs, bytes[] memory challengeInput)
        public
        view
        override
        returns (types.Property memory)
    {
        return
            types.Property({predicateAddress: address(this), inputs: inputs});
    }
}
