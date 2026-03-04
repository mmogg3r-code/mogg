// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable2Step.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/// @title FairCoinflipBank
/// @notice Treasury contract for a coinflip game with hardened admin controls.
/// @dev Owner is deployer, ownership transfer requires 2-step acceptance.
contract FairCoinflipBank is Ownable2Step, Pausable, ReentrancyGuard {
    uint256 public maxSingleWithdrawal;

    event Deposited(address indexed sender, uint256 amount);
    event Withdrawn(address indexed admin, address indexed to, uint256 amount);
    event MaxSingleWithdrawalUpdated(uint256 oldAmount, uint256 newAmount);

    error InvalidRecipient();
    error InvalidAmount();
    error ExceedsSingleWithdrawalLimit(uint256 amount, uint256 maxAllowed);
    error WithdrawFailed();

    constructor(uint256 _maxSingleWithdrawal) Ownable(msg.sender) {
        if (_maxSingleWithdrawal == 0) {
            revert InvalidAmount();
        }
        maxSingleWithdrawal = _maxSingleWithdrawal;
        emit MaxSingleWithdrawalUpdated(0, _maxSingleWithdrawal);
    }

    receive() external payable whenNotPaused {
        if (msg.value == 0) {
            revert InvalidAmount();
        }
        emit Deposited(msg.sender, msg.value);
    }

    /// @notice Admin withdraw function for operational treasury control.
    /// @dev Pausable + nonReentrant to reduce emergency and reentrancy risk.
    function withdraw(address payable to, uint256 amount) external onlyOwner whenNotPaused nonReentrant {
        if (to == address(0)) {
            revert InvalidRecipient();
        }
        if (amount == 0 || amount > address(this).balance) {
            revert InvalidAmount();
        }
        if (amount > maxSingleWithdrawal) {
            revert ExceedsSingleWithdrawalLimit(amount, maxSingleWithdrawal);
        }

        (bool success, ) = to.call{value: amount}("");
        if (!success) {
            revert WithdrawFailed();
        }

        emit Withdrawn(msg.sender, to, amount);
    }

    /// @notice Emergency drain path while paused, e.g. incident response.
    function emergencyWithdrawAll(address payable to) external onlyOwner whenPaused nonReentrant {
        if (to == address(0)) {
            revert InvalidRecipient();
        }

        uint256 balance = address(this).balance;
        if (balance == 0) {
            revert InvalidAmount();
        }

        (bool success, ) = to.call{value: balance}("");
        if (!success) {
            revert WithdrawFailed();
        }

        emit Withdrawn(msg.sender, to, balance);
    }

    function setMaxSingleWithdrawal(uint256 newMax) external onlyOwner {
        if (newMax == 0) {
            revert InvalidAmount();
        }

        uint256 previous = maxSingleWithdrawal;
        maxSingleWithdrawal = newMax;
        emit MaxSingleWithdrawalUpdated(previous, newMax);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }
}
