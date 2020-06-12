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

    function setCheckPoints(bytes32 key) external isDeposit {
        eternalStorage().setBool(key, true);
    }

    function getCheckPoints(bytes32 key) external view returns (bool) {
        return eternalStorage().getBool(key);
    }

    function setTotalDeposited(uint256 _value) external isDeposit {
        bytes32 key = getTotalDepositedKey();
        eternalStorage().setUint(key, _value);
    }

    function getTotalDeposited() external view returns (uint256) {
        bytes32 key = getTotalDepositedKey();
        return eternalStorage().getUint(key);
    }

    function getTotalDepositedKey() private pure returns (bytes32) {
        return keccak256(abi.encodePacked("_totalDeposited"));
    }

    function setRangeStart(uint256 _key, uint256 _value) external isDeposit {
        bytes32 key = getRangeStartKey(_key);
        eternalStorage().setUint(key, _value);
    }

    function getRangeStart(uint256 _key) external view returns (uint256) {
        bytes32 key = getRangeStartKey(_key);
        return eternalStorage().getUint(key);
    }

    function deleteRangeStart(uint256 _key) external {
        bytes32 key = getRangeStartKey(_key);
        return eternalStorage().deleteUint(key);
    }

    function getRangeStartKey(uint256 _key) private pure returns (bytes32) {
        return keccak256(abi.encodePacked("_rangeStart", _key));
    }

    function setRangeEnd(uint256 _key, uint256 _value) external isDeposit {
        bytes32 key = getRangeEndKey(_key);
        eternalStorage().setUint(key, _value);
    }

    function getRangeEnd(uint256 _key) external view returns (uint256) {
        bytes32 key = getRangeEndKey(_key);
        return eternalStorage().getUint(key);
    }

    function deleteRangeEnd(uint256 _key) external {
        bytes32 key = getRangeEndKey(_key);
        return eternalStorage().deleteUint(key);
    }

    function getRangeEndKey(uint256 _key) private pure returns (bytes32) {
        return keccak256(abi.encodePacked("_rangeEnd", _key));
    }
}
