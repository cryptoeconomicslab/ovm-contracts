pragma solidity ^0.5.0;
pragma experimental ABIEncoderV2;

import {DataTypes as types} from "../../DataTypes.sol";
import "../../Utils.sol";
import "./BaseAtomicPredicate.sol";
import "../../Library/ECRecover.sol";
import "../TypedDataPredicate.sol";

contract IsValidSignaturePredicate is BaseAtomicPredicate {
    bytes32 secp256k1 = keccak256(abi.encodePacked(string("secp256k1")));
    bytes32 typedData = keccak256(abi.encodePacked(string("typedData")));

    constructor(address _uacAddress, address _utilsAddress)
        public
        BaseAtomicPredicate(_uacAddress, _utilsAddress)
    {}

    function decide(bytes[] memory _inputs) public view returns (bool) {
        bytes32 hashedMessage;
        bytes32 verifierType = keccak256(_inputs[3]);
        if (verifierType == typedData) {
            hashedMessage = hashTransaction(_inputs[0]);
        } else if (verifierType == secp256k1) {
            hashedMessage = keccak256(_inputs[0]);
        } else {
            revert("unknown verifier type");
        }
        require(
            ECRecover.ecverify(
                hashedMessage,
                _inputs[1],
                utils.bytesToAddress(_inputs[2])
            ),
            "_inputs[1] must be signature of _inputs[0] by _inputs[2]"
        );
        return true;
    }

    /**
     * @dev create hash of transaction as TypedData format.
     */
    function hashTransaction(bytes memory message)
        public
        pure
        returns (bytes32)
    {
        types.Transaction memory transaction = abi.decode(
            message,
            (types.Transaction)
        );
        address token = transaction.depositContractAddress;
        types.Range memory range = transaction.range;
        types.Property memory stateObject = transaction.nextStateObject;
        address owner = abi.decode(stateObject.inputs[0], (address));

        return
            keccak256(
                abi.encodePacked(
                    keccak256(
                        abi.encodePacked(
                            "address token",
                            "uint256 amount",
                            "address owner", // TODO: fix to dynamic predicate
                            "bytes transaction"
                        )
                    ),
                    keccak256(
                        abi.encodePacked(
                            token,
                            range.end - range.start,
                            owner, // TODO: fix to dynamic predicate
                            message
                        )
                    )
                )
            );
    }
}
