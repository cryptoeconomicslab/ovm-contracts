pragma solidity ^0.6.0;
pragma experimental ABIEncoderV2;

import {DataTypes as types} from "../../DataTypes.sol";
import "../../Utils.sol";
import "./BaseAtomicPredicate.sol";
import "../../Library/ECRecover.sol";

contract IsValidSignaturePredicate is BaseAtomicPredicate {
    constructor(address _uacAddress, address _utilsAddress)
        public
        BaseAtomicPredicate(_uacAddress, _utilsAddress)
    {}

    function decide(bytes[] memory _inputs)
        public
        view
        override
        returns (bool)
    {
        require(
            keccak256(
                abi.encodePacked(string(utils.getInputValue(_inputs[3])))
            ) ==
                keccak256("secp256k1"),
            "verifierType must be secp256k1"
        );
        require(
            ECRecover.ecverify(
                keccak256(_inputs[0]),
                _inputs[1],
                utils.bytesToAddress(_inputs[2])
            ),
            "_inputs[1] must be signature of _inputs[0] by _inputs[2]"
        );
        return true;
    }
}
