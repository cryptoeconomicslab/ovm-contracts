pragma solidity ^0.5.0;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20Detailed.sol";

/**
 * @dev PlasmaETH is ERC20 Token wrap ETH for Plasma
 */
contract DummyERC20 is ERC20, ERC20Detailed {
    constructor(string memory name, string memory symbol, uint8 decimals)
        public
        ERC20()
        ERC20Detailed(name, symbol, decimals)
    {}
}
