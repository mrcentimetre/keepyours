// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IAdvancePool} from "../../src/interfaces/IAdvancePool.sol";
import {KeepVault} from "../../src/KeepVault.sol";

contract MockUSDC is ERC20 {
    constructor() ERC20("USD Coin", "USDC") {}

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

/// Stand-in for AdvancePool (T4.2): lends its own USDC, charges whatever
/// fee the test sets, and pulls repayments from the vault.
contract MockPool is IAdvancePool {
    IERC20 public immutable usdc;
    mapping(address => uint256) public principal;
    mapping(address => uint256) public fee;

    constructor(IERC20 usdc_) {
        usdc = usdc_;
    }

    function setFee(address vault, uint256 f) external {
        fee[vault] = f;
    }

    function lend(address to, uint256 amount) external {
        require(principal[msg.sender] == 0, "open");
        principal[msg.sender] = amount;
        usdc.transfer(to, amount);
    }

    function repay(uint256 amount) external {
        usdc.transferFrom(msg.sender, address(this), amount);
        uint256 f = fee[msg.sender];
        uint256 toFee = amount < f ? amount : f;
        fee[msg.sender] = f - toFee;
        principal[msg.sender] -= amount - toFee;
    }

    function owedNow(address vault) external view returns (uint256) {
        return principal[vault] + fee[vault];
    }

    function owedMax(address vault) external view returns (uint256) {
        return (principal[vault] * 10_300) / 10_000;
    }

    /// What settle() will do after day 90.
    function settle(KeepVault vault, uint256 amount) external {
        vault.releaseToPool(amount);
        principal[address(vault)] -= amount;
    }
}
