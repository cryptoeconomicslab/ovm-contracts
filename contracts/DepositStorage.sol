pragma solidity ^0.5.0;

import "./Storage/UsingStorage.sol";

contract DepositStorage is UsingStorage {
    address private deposit;

    function setDepositAddress(address _deposit) external onlyOwner {
        deposit = _deposit;
    }

    modifier isDeposit() {
        require(msg.sender == deposit, "deposit only");
        _;
    }

    function setErc20(address _address) external isDeposit {
        bytes32 key = getErc20Key();
        eternalStorage().setAddress(key, _address);
    }

    function getErc20() external view returns (address) {
        bytes32 key = getErc20Key();
        return eternalStorage().getAddress(key);
    }

    function getErc20Key() private pure returns (bytes32) {
        return keccak256(abi.encodePacked("_erc20"));
    }

    function setCommitment(address _address) external isDeposit {
        bytes32 key = getCommitmentKey();
        eternalStorage().setAddress(key, _address);
    }

    function getCommitment() external view returns (address) {
        bytes32 key = getCommitmentKey();
        return eternalStorage().getAddress(key);
    }

    function getCommitmentKey() private pure returns (bytes32) {
        return keccak256(abi.encodePacked("_commitment"));
    }

    function setUniversalAdjudication(address _address) external isDeposit {
        bytes32 key = getUniversalAdjudicationKey();
        eternalStorage().setAddress(key, _address);
    }

    function getUniversalAdjudication() external view returns (address) {
        bytes32 key = getUniversalAdjudicationKey();
        return eternalStorage().getAddress(key);
    }

    function getUniversalAdjudicationKey() private pure returns (bytes32) {
        return keccak256(abi.encodePacked("_universalAdjudication"));
    }

    function setStateUpdatePredicate(address _address) external isDeposit {
        bytes32 key = getStateUpdatePredicateKey();
        eternalStorage().setAddress(key, _address);
    }

    function getStateUpdatePredicate() external view returns (address) {
        bytes32 key = getStateUpdatePredicateKey();
        return eternalStorage().getAddress(key);
    }

    function getStateUpdatePredicateKey() private pure returns (bytes32) {
        return keccak256(abi.encodePacked("_stateUpdatePredicate"));
    }

    function setExitPredicate(address _address) external isDeposit {
        bytes32 key = getExitPredicateKey();
        eternalStorage().setAddress(key, _address);
    }

    function getExitPredicate() external view returns (address) {
        bytes32 key = getExitPredicateKey();
        return eternalStorage().getAddress(key);
    }

    function getExitPredicateKey() private pure returns (bytes32) {
        return keccak256(abi.encodePacked("_exitPredicate"));
    }

    function setExitDepositPredicate(address _address) external isDeposit {
        bytes32 key = getExitDepositPredicateKey();
        eternalStorage().setAddress(key, _address);
    }

    function getExitDepositPredicate() external view returns (address) {
        bytes32 key = getExitDepositPredicateKey();
        return eternalStorage().getAddress(key);
    }

    function getExitDepositPredicateKey() private pure returns (bytes32) {
        return keccak256(abi.encodePacked("_exitDepositPredicate"));
    }
}
