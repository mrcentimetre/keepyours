// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

/// @notice What a KeepVault needs from the AdvancePool. The pool is the single
/// source of truth for what a vault owes.
interface IAdvancePool {
    /// Lends `amount` of the pool's own USDC to `to`. Callable by genuine vaults only.
    function lend(address to, uint256 amount) external;

    /// Pulls `amount` USDC from the calling vault (it approves first) and records
    /// it against the open advance: fee first, then principal.
    function repay(uint256 amount) external;

    /// What the vault would owe if it repaid in full right now.
    function owedNow(address vault) external view returns (uint256);

    /// Principal plus the 3% cap. The collateral a vault must keep reserved.
    function owedMax(address vault) external view returns (uint256);
}
