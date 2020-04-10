pragma solidity ^0.5.0;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20Detailed.sol";

/**
 * @dev PlasmaETH is ERC20 Token wrap ETH for Plasma
 */
contract PlasmaETH is ERC20, ERC20Detailed {
    constructor(string memory name, string memory symbol, uint8 decimals)
        public
        ERC20()
        ERC20Detailed(name, symbol, decimals)
    {}

    /**
     * @dev wrap ETH in PlasmaETH
     */
    function wrap(uint256 _amount) public payable {
        require(
            _amount == msg.value,
            "_amount and msg.value must be same value"
        );
        _mint(msg.sender, _amount);
    }

    /**
     * @dev unwrap PlasmaETH
     */
    function unwrap(uint256 _amount) public {
        _unwrap(msg.sender, _amount);
    }

    /**
     * @dev transfer PlasmaETH as ETH
     */
    function transfer(address _address, uint256 _amount) public returns (bool) {
        // TODO: we can write `paybale(userAddress)` after v0.6.0
        _unwrap(address(uint160(_address)), _amount);
        return true;
    }

    /**
     * @dev unwrap PlasmaETH and transfer ETH
     */
    function _unwrap(address payable _address, uint256 _amount) private {
        require(
            balanceOf(_address) >= _amount,
            "PlasmaETH: unwrap amount exceeds balance"
        );
        _burn(_address, _amount);
        _address.transfer(_amount);
    }
}
