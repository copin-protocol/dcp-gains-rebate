// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockERC20 is ERC20 {
    bool private transferFromSuccess;
    bool private transferSuccess;
    
    uint256 public constant initialSupply = 500_000_000_000 * 10 ** uint256(18);

    constructor() ERC20("Arbitrum", "ARB") {
        transferFromSuccess = true;
        transferSuccess = true;
        _mint(msg.sender, initialSupply);
    }

    function setTransferFromSuccess(bool success) external {
        transferFromSuccess = success;
    }

    function setTransferSuccess(bool success) external {
        transferSuccess = success;
    }

    function transferFrom(
        address sender,
        address recipient,
        uint256 amount
    ) public override returns (bool) {
        require(transferFromSuccess, "Mock transferFrom failed");

        return super.transferFrom(sender, recipient, amount);
    }

    function transfer(
        address recipient,
        uint256 amount
    ) public override returns (bool) {
        require(transferSuccess, "Mock transfer failed");

        return super.transfer(recipient, amount);
    }
}
