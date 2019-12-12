pragma solidity ^0.5.0;

library ECRecover {
    function ecverify(bytes32 hash, bytes memory sig, address signer)
        public
        pure
        returns (bool)
    {
        return signer == recover(hash, sig);
    }

    function recover(bytes32 hash, bytes memory signature)
        private
        pure
        returns (address)
    {
        require(signature.length == 65, "The length of signature must be 66");
        uint8 v;
        bytes32 r;
        bytes32 s;
        assembly {
            r := mload(add(signature, 32))
            s := mload(add(signature, 64))
            v := and(mload(add(signature, 65)), 255)
        }
        return ecrecover(hash, v, r, s);
    }
}
