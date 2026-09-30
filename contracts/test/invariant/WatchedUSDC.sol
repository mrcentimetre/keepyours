// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {KeepVault} from "../../src/KeepVault.sol";

/// USDC that notices when money leaves a vault for anywhere other than its
/// spendTo, its safePlace or the pool (invariants 1, 5 and 7).
contract WatchedUSDC is ERC20 {
    mapping(address => bool) public watched;
    address public pool;
    uint256 public badTransfers;

    constructor() ERC20("USD Coin", "USDC") {}

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    function watch(address vault, address pool_) external {
        watched[vault] = true;
        pool = pool_;
    }

    function _update(address from, address to, uint256 value) internal override {
        if (watched[from] && value > 0) {
            KeepVault.Config memory c = KeepVault(from).config();
            if (to != c.spendTo && to != c.safePlace && to != pool) badTransfers++;
            if (c.guardian != address(0) && to == c.guardian) badTransfers++;
        }
        super._update(from, to, value);
    }
}
