pragma solidity ^0.6.0;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title MockToken
 * @notice Mock ERC20 Token contract
 */
contract MockToken is ERC20 {
    bool isFail = false;

    constructor() public ERC20("MOCK", "mock token") {}

    function setFailingMode(bool _isFail) public {
        isFail = _isFail;
    }

    function approve(address spender, uint256 amount)
        public
        override
        returns (bool)
    {
        require(!isFail);
        return true;
    }

    function transfer(address recipient, uint256 amount)
        public
        override
        returns (bool)
    {
        require(!isFail);
        return true;
    }

    function transferFrom(address sender, address recipient, uint256 amount)
        public
        override
        returns (bool)
    {
        require(!isFail);
        return true;
    }
}
