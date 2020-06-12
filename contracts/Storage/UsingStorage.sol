pragma solidity ^0.5.0;

import "@openzeppelin/contracts/ownership/Ownable.sol";
import "@openzeppelin/contracts/lifecycle/Pausable.sol";
import "./EternalStorage.sol";

contract UsingStorage is Ownable, Pausable {
    address private _storage;

    modifier hasStorage() {
        require(_storage != address(0), "storage is not set");
        _;
    }

    function eternalStorage()
        internal
        view
        hasStorage
        returns (EternalStorage)
    {
        require(paused() == false, "You cannot use that");
        return EternalStorage(_storage);
    }

    function getStorageAddress() external view hasStorage returns (address) {
        return _storage;
    }

    function createStorage() external onlyOwner {
        require(_storage == address(0), "storage is set");
        EternalStorage tmp = new EternalStorage();
        _storage = address(tmp);
    }

    function setStorage(address _storageAddress) external onlyOwner {
        _storage = _storageAddress;
    }

    function changeOwner(address newOwner) external onlyOwner {
        EternalStorage(_storage).changeOwner(newOwner);
    }
}