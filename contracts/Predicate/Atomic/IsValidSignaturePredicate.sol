pragma solidity ^0.5.0;
pragma experimental ABIEncoderV2;

import {DataTypes as types} from "../../DataTypes.sol";
import "../AtomicPredicate.sol";
import {UniversalAdjudicationContract} from "../../UniversalAdjudicationContract.sol";
import "../../Utils.sol";

contract IsValidSignaturePredicate is AtomicPredicate {
    address uacAddress;
    Utils utils;

    constructor(address _uacAddress, address utilsAddress) public {
        uacAddress = _uacAddress;
        utils = Utils(utilsAddress);
    }

    function createPropertyFromInput(bytes[] memory _inputs) public view returns (types.Property memory) {
        types.Property memory property = types.Property({
            predicateAddress: address(this),
            inputs: _inputs
        });
        return property;
    }

    function decideTrue(bytes[] memory _inputs) public {
        require(keccak256(abi.encodePacked(string(_inputs[3]))) == keccak256("secp256k1"), "verifierType must be secp256k1");
        require(ecverify(
            keccak256(_inputs[0]),
            _inputs[1],
            bytesToAddress(_inputs[2])
        ), "This property is not true");

        types.Property memory property = createPropertyFromInput(_inputs);
        UniversalAdjudicationContract(uacAddress).setPredicateDecision(utils.getPropertyId(property), true);
    }

    function bytesToAddress(bytes memory addressBytes) private pure returns (address addr) {
        assembly {
            addr := mload(add(addressBytes, 20))
        } 
    }

    function ecverify(bytes32 hash, bytes memory sig, address signer) private pure returns (bool) {
        return signer == recover(hash, sig);
    }

    function recover(
        bytes32 hash,
        bytes memory signature
    ) private pure returns (address) {
        require(signature.length == 65, "The length of signature must be 66");
        uint8 v;
        bytes32 r;
        bytes32 s;
        assembly {
            r := mload(add(signature, 32))
            s := mload(add(signature, 64))
            v := and(mload(add(signature, 65)), 255)
        }
        // hash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", hash));
        return ecrecover(
            hash,
            v,
            r,
            s);
    }
}
