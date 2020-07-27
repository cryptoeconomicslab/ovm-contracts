pragma solidity ^0.5.0;
pragma experimental ABIEncoderV2;

import {DataTypes as types} from "../DataTypes.sol";

library Deserializer {
    /**
     * @dev deserialize property to StateUpdate instance
     */
    function deserializeStateUpdate(types.Property memory _stateUpdate)
        public
        pure
        returns (types.StateUpdate memory)
    {
        address depositAddress = abi.decode(_stateUpdate.inputs[0], (address));
        types.Range memory range = abi.decode(
            _stateUpdate.inputs[1],
            (types.Range)
        );
        uint256 blockNumber = abi.decode(_stateUpdate.inputs[2], (uint256));
        types.Property memory stateObject = abi.decode(
            _stateUpdate.inputs[3],
            (types.Property)
        );
        return
            types.StateUpdate({
                blockNumber: blockNumber,
                depositContractAddress: depositAddress,
                range: range,
                stateObject: stateObject
            });
    }

    function bytesToAddress(bytes memory addressBytes)
        public
        pure
        returns (address addr)
    {
        assembly {
            addr := mload(add(addressBytes, 0x20))
        }
    }

    function bytesToBytes32(bytes memory source)
        public
        pure
        returns (bytes32 result)
    {
        if (source.length == 0) {
            return 0x0;
        }
        assembly {
            result := mload(add(source, 32))
        }
    }
}
