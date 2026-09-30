// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Test, console} from "forge-std/Test.sol";
import {KeepVault} from "../../src/KeepVault.sol";
import {KeepVaultFactory} from "../../src/KeepVaultFactory.sol";
import {AdvancePool} from "../../src/AdvancePool.sol";
import {WatchedUSDC} from "./WatchedUSDC.sol";
import {Handler} from "./Handler.sol";

/// The invariants from docs/CONTRACTS.md, checked after every step of random
/// call sequences (config: [invariant] in foundry.toml).
/// forge-config: default.invariant.runs = 128
/// forge-config: default.invariant.depth = 256
contract KeepYoursInvariants is Test {
    uint16 constant BPS = 10_000;

    WatchedUSDC usdc;
    AdvancePool pool;
    KeepVaultFactory factory;
    Handler handler;
    address builder = makeAddr("builder");
    address feeSink = makeAddr("feeSink");

    function setUp() public {
        usdc = new WatchedUSDC();
        vm.startPrank(builder);
        pool = new AdvancePool(usdc, feeSink, 30 days, 150, 300);
        KeepVault impl = new KeepVault(usdc, 200e6, 1 days);
        factory = new KeepVaultFactory(address(impl), address(pool));
        pool.setFactory(factory);
        usdc.mint(builder, 2_000e6);
        usdc.approve(address(pool), 2_000e6);
        pool.fund(2_000e6);
        vm.stopPrank();

        uint16[3] memory keep = [uint16(4000), 10_000, 2500];
        KeepVault[] memory vaults = new KeepVault[](3);
        address[] memory guardians = new address[](3);
        for (uint256 i; i < 3; i++) {
            address owner = makeAddr(string.concat("owner", vm.toString(i)));
            guardians[i] = makeAddr(string.concat("guardian", vm.toString(i)));
            KeepVault.Config memory c = KeepVault.Config({
                spendTo: makeAddr(string.concat("spend", vm.toString(i))),
                safePlace: makeAddr(string.concat("safe", vm.toString(i))),
                guardian: i == 0 ? guardians[i] : address(0),
                keepBps: keep[i],
                cooldown: uint32(3 days)
            });
            vm.prank(owner);
            vaults[i] = KeepVault(factory.createVault(c));
            usdc.watch(address(vaults[i]), address(pool));
        }

        handler = new Handler(usdc, pool, builder, vaults, guardians);
        targetContract(address(handler));
    }

    function _each(function(KeepVault) internal view check) internal view {
        for (uint256 i; i < handler.vaultCount(); i++) {
            check(handler.vaults(i));
        }
    }

    /// 3. An open advance is always covered.
    function invariant_advanceCovered() public view {
        _each(_covered);
    }

    function _covered(KeepVault v) internal view {
        assertGe(v.saved(), pool.owedMax(address(v)));
    }

    /// 4. Withdrawable = saved - owedMax.
    function invariant_withdrawable() public view {
        _each(_withdrawable);
    }

    function _withdrawable(KeepVault v) internal view {
        assertEq(v.withdrawable() + pool.owedMax(address(v)), v.saved());
    }

    /// 9. Each vault's balance is at least its saved, and never lowered by
    /// anything done to another vault or by the pool owner.
    function invariant_segregation() public view {
        _each(_backed);
        assertEq(handler.crossVaultDrops(), 0);
    }

    function _backed(KeepVault v) internal view {
        assertGe(usdc.balanceOf(address(v)), v.saved());
        assertLe(v.saved(), v.depositCap());
    }

    /// 9. The pool never loses capital it lent out.
    function invariant_poolAccounting() public view {
        assertGe(usdc.balanceOf(address(pool)) + pool.totalOutstanding(), pool.totalFunded() - pool.totalWithdrawn());
    }

    /// 1, 5 (TESTING.md) and 7. Money leaves a vault only for its spendTo,
    /// its safePlace or the pool, and never for the guardian.
    function invariant_destinations() public view {
        assertEq(usdc.badTransfers(), 0);
        assertEq(handler.guardianPaid(), 0);
        assertEq(handler.wrongWithdrawTarget(), 0);
    }

    /// 5. No release before the waiting period unless the guardian approved.
    function invariant_releaseTiming() public view {
        assertEq(handler.earlyReleases(), 0);
    }

    /// 6. A weaker setting never takes effect before the current cooldown.
    function invariant_settingsTiming() public view {
        assertEq(handler.earlySettings(), 0);
    }

    /// 11. One advance at a time, and total fees never above 3% of what was
    /// repaid (allowing a wei of rounding per call).
    function invariant_feeCap() public view {
        uint256 repaid = handler.lentTotal() - pool.totalOutstanding();
        assertLe(usdc.balanceOf(feeSink) * BPS, repaid * 300 + handler.calls() * 2 * BPS);
    }

    /// Prints how often each path succeeded across the whole campaign (-vv).
    function afterInvariant() public view {
        console.log("advances", handler.advances(), "repaid on process", handler.repaidOnProcess());
        console.log("withdrawals", handler.withdrawals(), "settles", handler.settles());
        console.log("weaker proposed", handler.weakerProposed(), "applied", handler.settingsApplied());
    }

    /// 10. Only factory vaults are genuine; the implementation never is.
    function invariant_genuine() public view {
        _each(_genuine);
    }

    function _genuine(KeepVault v) internal view {
        assertTrue(factory.isVault(address(v)));
        assertEq(factory.vaultOf(v.owner()), address(v));
    }
}
