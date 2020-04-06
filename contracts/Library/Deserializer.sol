pragma solidity ^0.5.0;
pragma experimental ABIEncoderV2;

import {DataTypes as types} from "../DataTypes.sol";

library Deserializer {
    /**
     * @dev deserialize property to Exit instance
     */
    function deserializeExit(types.Property memory _exit)
        public
        pure
        returns (types.Exit memory)
    {
        types.Property memory stateUpdateProperty = abi.decode(
            _exit.inputs[0],
            (types.Property)
        );
        types.InclusionProof memory inclusionProof = abi.decode(
            _exit.inputs[1],
            (types.InclusionProof)
        );
        return
            types.Exit({
                stateUpdate: deserializeStateUpdate(stateUpdateProperty),
                inclusionProof: inclusionProof
            });
    }

    /**
     * @dev deserialize property to ExitDeposit instance
     */
    function deserializeExitDeposit(types.Property memory _exit)
        public
        pure
        returns (types.ExitDeposit memory)
    {
        types.Property memory stateUpdateProperty = abi.decode(
            _exit.inputs[0],
            (types.Property)
        );
        types.Property memory checkpointProperty = abi.decode(
            _exit.inputs[1],
            (types.Property)
        );

        return
            types.ExitDeposit({
                stateUpdate: deserializeStateUpdate(stateUpdateProperty),
                checkpoint: deserializeCheckpoint(checkpointProperty)
            });
    }

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

    function deserializeCheckpoint(types.Property memory _checkpoint)
        public
        pure
        returns (types.Checkpoint memory)
    {
        types.Property memory stateUpdate = abi.decode(
            _checkpoint.inputs[0],
            (types.Property)
        );
        return types.Checkpoint({stateUpdate: stateUpdate});
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
