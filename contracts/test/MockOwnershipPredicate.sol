pragma solidity ^0.5.0;
pragma experimental ABIEncoderV2;

import {CompiledPredicate} from "../Predicate/CompiledPredicate.sol";
import "../DepositContract.sol";

/**
 * @title MockOwnershipPredicate
 * @notice Mock of compiled ownership predicate
 */
contract MockOwnershipPredicate is CompiledPredicate {
    address public depositContractAddress;
    constructor(address _depositContractAddress) public {
        depositContractAddress = _depositContractAddress;
    }
    function isValidChallenge(
        bytes[] memory _inputs,
        bytes memory _challengeInput,
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
        types.Property memory _exitProperty,
        uint256 _depositedRangeId
    ) public {
        DepositContract(depositContractAddress).finalizeExit(
            _exitProperty,
            _depositedRangeId
        );
    }
}
