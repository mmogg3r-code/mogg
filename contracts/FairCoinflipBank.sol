// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";

/// @title FairCoinflipBank
/// @notice Treasury contract for a coinflip game. Only the deployer/owner can withdraw bankroll.
contract FairCoinflipBank is Ownable {
    event Deposited(address indexed sender, uint256 amount);
    event Withdrawn(address indexed admin, address indexed to, uint256 amount);

    constructor() Ownable(msg.sender) {}

    receive() external payable {
        emit Deposited(msg.sender, msg.value);
    }

    function withdraw(address payable to, uint256 amount) external onlyOwner {
        require(to != address(0), "invalid recipient");
        require(amount <= address(this).balance, "insufficient balance");

        (bool success, ) = to.call{value: amount}("");
        require(success, "withdraw failed");

        emit Withdrawn(msg.sender, to, amount);
    }
}
