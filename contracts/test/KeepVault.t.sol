// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Test} from "forge-std/Test.sol";
import {Clones} from "@openzeppelin/contracts/proxy/Clones.sol";
import {Initializable} from "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import {KeepVault} from "../src/KeepVault.sol";
import {MockUSDC, MockPool} from "./mocks/Mocks.sol";

contract KeepVaultTest is Test {
    uint256 constant USDC = 1e6;
    uint256 constant CAP = 200 * USDC;
    uint32 constant DAY = 1 days;

    MockUSDC usdc;
    MockPool pool;
    KeepVault impl;
    KeepVault vault;

    address owner = makeAddr("owner");
    address spend = makeAddr("spend");
    address safe = makeAddr("safe");
    address guardian = makeAddr("guardian");
    address payer = makeAddr("payer");
    address stranger = makeAddr("stranger");

    function setUp() public {
        usdc = new MockUSDC();
        pool = new MockPool(usdc);
        usdc.mint(address(pool), 1_000 * USDC);
        impl = new KeepVault(usdc, CAP, DAY);
        vault = _newVault(_cfg(4000, 3 * DAY, address(0)));
    }

    // ── helpers ────────────────────────────────────────────────

    function _cfg(uint16 keepBps, uint32 cooldown, address g) internal view returns (KeepVault.Config memory) {
        return KeepVault.Config({spendTo: spend, safePlace: safe, guardian: g, keepBps: keepBps, cooldown: cooldown});
    }

    function _newVault(KeepVault.Config memory c) internal returns (KeepVault v) {
        v = KeepVault(Clones.clone(address(impl)));
        v.initialize(owner, address(pool), c);
    }

    function _pay(KeepVault v, uint256 amount) internal {
        usdc.mint(payer, amount);
        vm.prank(payer);
        usdc.transfer(address(v), amount);
        v.process();
    }

    // ── initialise ─────────────────────────────────────────────

    function test_initialize_onlyOnce() public {
        vm.expectRevert(Initializable.InvalidInitialization.selector);
        vault.initialize(stranger, address(pool), _cfg(4000, 3 * DAY, address(0)));
    }

    function test_implementation_cannotBeInitialized() public {
        vm.expectRevert(Initializable.InvalidInitialization.selector);
        impl.initialize(owner, address(pool), _cfg(4000, 3 * DAY, address(0)));
    }

    function test_initialize_rejectsBadConfig() public {
        KeepVault v = KeepVault(Clones.clone(address(impl)));
        vm.expectRevert(KeepVault.BadConfig.selector);
        v.initialize(owner, address(pool), _cfg(10_001, 3 * DAY, address(0)));
        vm.expectRevert(KeepVault.BadConfig.selector);
        v.initialize(owner, address(pool), _cfg(4000, 1 hours, address(0)));
        vm.expectRevert(KeepVault.BadConfig.selector);
        v.initialize(owner, address(pool), _cfg(4000, 31 * DAY, address(0)));
        // guardian can never be paid
        vm.expectRevert(KeepVault.BadConfig.selector);
        v.initialize(owner, address(pool), _cfg(4000, 3 * DAY, safe));
        vm.expectRevert(KeepVault.ZeroAddress.selector);
        v.initialize(address(0), address(pool), _cfg(4000, 3 * DAY, address(0)));
    }

    // ── process and split ──────────────────────────────────────

    function test_process_splitsSpendAndKeep() public {
        _pay(vault, 100 * USDC);
        assertEq(usdc.balanceOf(spend), 60 * USDC);
        assertEq(vault.saved(), 40 * USDC);
        assertEq(usdc.balanceOf(address(vault)), 40 * USDC);
    }

    function test_process_depositBeforeVaultExistsIsKept() public {
        // same CREATE2 path the factory uses (salt = owner)
        bytes32 salt = bytes32(uint256(uint160(owner)));
        address predicted = Clones.predictDeterministicAddress(address(impl), salt);
        usdc.mint(predicted, 50 * USDC);
        KeepVault v = KeepVault(Clones.cloneDeterministic(address(impl), salt));
        v.initialize(owner, address(pool), _cfg(4000, 3 * DAY, address(0)));
        assertEq(address(v), predicted);
        v.process();
        assertEq(v.saved(), 20 * USDC);
        assertEq(usdc.balanceOf(spend), 30 * USDC);
    }

    function test_process_nothingNewIsNoop() public {
        _pay(vault, 100 * USDC);
        vault.process();
        assertEq(vault.saved(), 40 * USDC);
        assertEq(usdc.balanceOf(spend), 60 * USDC);
    }

    function test_process_keepNone() public {
        KeepVault v = _newVault(_cfg(0, 3 * DAY, address(0)));
        _pay(v, 100 * USDC);
        assertEq(v.saved(), 0);
        assertEq(usdc.balanceOf(spend), 100 * USDC);
    }

    function test_process_keepAll() public {
        KeepVault v = _newVault(_cfg(10_000, 3 * DAY, address(0)));
        _pay(v, 100 * USDC);
        assertEq(v.saved(), 100 * USDC);
        assertEq(usdc.balanceOf(spend), 0);
    }

    function test_process_overCapGoesToSpend() public {
        KeepVault v = _newVault(_cfg(10_000, 3 * DAY, address(0)));
        _pay(v, 150 * USDC);
        _pay(v, 100 * USDC);
        assertEq(v.saved(), CAP);
        assertEq(usdc.balanceOf(spend), 50 * USDC);
    }

    function test_process_anyoneCanCall() public {
        usdc.mint(address(vault), 100 * USDC);
        vm.prank(stranger);
        vault.process();
        assertEq(vault.saved(), 40 * USDC);
        assertEq(usdc.balanceOf(spend), 60 * USDC);
        assertEq(usdc.balanceOf(stranger), 0);
    }

    function test_process_repaysAdvanceFirst() public {
        _pay(vault, 100 * USDC); // saved 40
        vm.prank(owner);
        vault.advance(10 * USDC);
        assertEq(usdc.balanceOf(spend), 70 * USDC);

        _pay(vault, 50 * USDC); // 10 repays, 40 splits: 24 spend, 16 keep
        assertEq(pool.owedNow(address(vault)), 0);
        assertEq(usdc.balanceOf(spend), 94 * USDC);
        assertEq(vault.saved(), 56 * USDC);
    }

    function test_process_smallerThanOwedAllRepays() public {
        _pay(vault, 100 * USDC);
        vm.prank(owner);
        vault.advance(10 * USDC);
        pool.setFee(address(vault), 3 * USDC / 10);

        _pay(vault, 5 * USDC);
        assertEq(vault.saved(), 40 * USDC);
        assertEq(usdc.balanceOf(spend), 70 * USDC);
        assertEq(pool.owedNow(address(vault)), 10 * USDC + 3 * USDC / 10 - 5 * USDC);
    }

    // ── advance ────────────────────────────────────────────────

    function test_advance_atExactLimit() public {
        KeepVault v = _newVault(_cfg(10_000, 3 * DAY, address(0)));
        _pay(v, 103 * USDC); // limit: amount * 1.03 <= 51.5
        vm.prank(owner);
        v.advance(50 * USDC);
        assertEq(pool.principal(address(v)), 50 * USDC);
    }

    function test_advance_oneWeiOverLimitReverts() public {
        KeepVault v = _newVault(_cfg(10_000, 3 * DAY, address(0)));
        _pay(v, 103 * USDC);
        vm.prank(owner);
        vm.expectRevert(KeepVault.AdvanceTooLarge.selector);
        v.advance(50 * USDC + 1);
    }

    function test_advance_secondWhileOpenReverts() public {
        _pay(vault, 100 * USDC);
        vm.startPrank(owner);
        vault.advance(5 * USDC);
        vm.expectRevert(KeepVault.AdvanceOpen.selector);
        vault.advance(1 * USDC);
        vm.stopPrank();
    }

    function test_advance_onlyOwner() public {
        _pay(vault, 100 * USDC);
        vm.prank(stranger);
        vm.expectRevert(KeepVault.NotOwner.selector);
        vault.advance(5 * USDC);
    }

    function test_advance_excludesPendingWithdrawal() public {
        KeepVault v = _newVault(_cfg(10_000, 3 * DAY, address(0)));
        _pay(v, 100 * USDC);
        vm.startPrank(owner);
        v.requestWithdraw(80 * USDC); // 20 left free -> limit ~9.7
        vm.expectRevert(KeepVault.AdvanceTooLarge.selector);
        v.advance(10 * USDC);
        v.advance(9 * USDC);
        vm.stopPrank();
    }

    // ── releaseToPool ──────────────────────────────────────────

    function test_releaseToPool_onlyPool() public {
        vm.prank(stranger);
        vm.expectRevert(KeepVault.NotPool.selector);
        vault.releaseToPool(1);
    }

    function test_releaseToPool_capsAtOwed() public {
        _pay(vault, 100 * USDC);
        vm.prank(owner);
        vault.advance(10 * USDC);
        vm.expectRevert(KeepVault.ExceedsOwed.selector);
        pool.settle(vault, 10 * USDC + 1);

        uint256 before = usdc.balanceOf(address(pool));
        pool.settle(vault, 10 * USDC);
        assertEq(vault.saved(), 30 * USDC);
        assertEq(usdc.balanceOf(address(pool)), before + 10 * USDC);
    }

    // ── withdrawals ────────────────────────────────────────────

    function test_requestWithdraw_aboveWithdrawableReverts() public {
        _pay(vault, 100 * USDC); // saved 40
        vm.startPrank(owner);
        vault.advance(10 * USDC); // reserves 10.3
        assertEq(vault.withdrawable(), 40 * USDC - 103 * USDC / 10);
        vm.expectRevert(KeepVault.ExceedsWithdrawable.selector);
        vault.requestWithdraw(30 * USDC);
        vault.requestWithdraw(29 * USDC);
        vm.stopPrank();
    }

    function test_executeWithdraw_beforeReleaseReverts() public {
        _pay(vault, 100 * USDC);
        vm.startPrank(owner);
        vault.requestWithdraw(10 * USDC);
        vm.warp(vm.getBlockTimestamp() + 3 * DAY - 1);
        vm.expectRevert(KeepVault.StillWaiting.selector);
        vault.executeWithdraw();
        vm.stopPrank();
    }

    function test_executeWithdraw_sendsToSafePlaceOnly() public {
        _pay(vault, 100 * USDC);
        vm.startPrank(owner);
        vault.requestWithdraw(10 * USDC);
        KeepVault.Pending memory p = vault.pendingWithdraw();
        assertEq(p.releaseAt - p.requestedAt, 3 * DAY);
        vm.warp(vm.getBlockTimestamp() + 3 * DAY);
        vault.executeWithdraw();
        vm.stopPrank();
        assertEq(usdc.balanceOf(safe), 10 * USDC);
        assertEq(usdc.balanceOf(owner), 0);
        assertEq(vault.saved(), 30 * USDC);
    }

    function test_executeWithdraw_onlyOwner() public {
        _pay(vault, 100 * USDC);
        vm.prank(owner);
        vault.requestWithdraw(10 * USDC);
        vm.warp(vm.getBlockTimestamp() + 3 * DAY);
        vm.prank(stranger);
        vm.expectRevert(KeepVault.NotOwner.selector);
        vault.executeWithdraw();
    }

    function test_cancelWithdraw_restoresAndClears() public {
        _pay(vault, 100 * USDC);
        vm.startPrank(owner);
        vault.requestWithdraw(40 * USDC);
        vault.cancelWithdraw();
        vm.stopPrank();
        assertEq(vault.pendingWithdraw().amount, 0);
        assertEq(vault.withdrawable(), 40 * USDC);
        vm.prank(owner);
        vm.expectRevert(KeepVault.NoWithdrawPending.selector);
        vault.executeWithdraw();
    }

    /// Decision: a second request while one is pending reverts; cancel first.
    function test_requestWithdraw_secondWhilePendingReverts() public {
        _pay(vault, 100 * USDC);
        vm.startPrank(owner);
        vault.requestWithdraw(10 * USDC);
        vm.expectRevert(KeepVault.WithdrawPending.selector);
        vault.requestWithdraw(5 * USDC);
        vm.stopPrank();
    }

    // ── settings ───────────────────────────────────────────────

    function test_settings_longerCooldownAppliesAtOnce() public {
        vm.prank(owner);
        vault.proposeSettings(_cfg(4000, 7 * DAY, address(0)));
        assertEq(vault.config().cooldown, 7 * DAY);
    }

    function test_settings_addingGuardianAppliesAtOnce() public {
        vm.prank(owner);
        vault.proposeSettings(_cfg(4000, 3 * DAY, guardian));
        assertEq(vault.config().guardian, guardian);
    }

    function test_settings_shorterCooldownWaits() public {
        vm.startPrank(owner);
        vault.proposeSettings(_cfg(4000, 1 * DAY, address(0)));
        assertEq(vault.config().cooldown, 3 * DAY);
        vm.warp(vm.getBlockTimestamp() + 3 * DAY - 1);
        vm.expectRevert(KeepVault.StillWaiting.selector);
        vault.applySettings();
        vm.warp(vm.getBlockTimestamp() + 1);
        vault.applySettings();
        vm.stopPrank();
        assertEq(vault.config().cooldown, 1 * DAY);
    }

    function test_settings_newSafePlaceWaits() public {
        KeepVault.Config memory c = _cfg(4000, 3 * DAY, address(0));
        c.safePlace = stranger;
        vm.prank(owner);
        vault.proposeSettings(c);
        assertEq(vault.config().safePlace, safe);
        assertEq(vault.pendingSettings().applyAt, vm.getBlockTimestamp() + 3 * DAY);
    }

    function test_settings_removingGuardianWaits() public {
        vm.startPrank(owner);
        vault.proposeSettings(_cfg(4000, 3 * DAY, guardian));
        vault.proposeSettings(_cfg(4000, 3 * DAY, address(0)));
        vm.stopPrank();
        assertEq(vault.config().guardian, guardian);
    }

    function test_settings_lowerKeepWaits() public {
        vm.prank(owner);
        vault.proposeSettings(_cfg(1000, 3 * DAY, address(0)));
        assertEq(vault.config().keepBps, 4000);
    }

    function test_settings_reproposeCurrentCancelsPending() public {
        vm.startPrank(owner);
        vault.proposeSettings(_cfg(4000, 1 * DAY, address(0)));
        vault.proposeSettings(_cfg(4000, 3 * DAY, address(0)));
        vm.expectRevert(KeepVault.NoSettingsPending.selector);
        vault.applySettings();
        vm.stopPrank();
    }

    function test_settings_onlyOwner() public {
        vm.prank(guardian);
        vm.expectRevert(KeepVault.NotOwner.selector);
        vault.proposeSettings(_cfg(4000, 3 * DAY, address(0)));
    }

    // ── guardian ───────────────────────────────────────────────

    function test_guardian_releasesExistingRequestOnly() public {
        vm.prank(owner);
        vault.proposeSettings(_cfg(4000, 3 * DAY, guardian));
        _pay(vault, 100 * USDC);

        vm.prank(guardian);
        vm.expectRevert(KeepVault.NoWithdrawPending.selector);
        vault.guardianApprove();

        vm.prank(owner);
        vault.requestWithdraw(10 * USDC);
        vm.prank(guardian);
        vault.guardianApprove();
        vm.prank(owner);
        vault.executeWithdraw();
        assertEq(usdc.balanceOf(safe), 10 * USDC);
        assertEq(usdc.balanceOf(guardian), 0);
    }

    function test_guardian_cannotWithdrawOrChangeSettings() public {
        vm.prank(owner);
        vault.proposeSettings(_cfg(4000, 3 * DAY, guardian));
        _pay(vault, 100 * USDC);
        vm.startPrank(guardian);
        vm.expectRevert(KeepVault.NotOwner.selector);
        vault.requestWithdraw(1);
        vm.expectRevert(KeepVault.NotOwner.selector);
        vault.proposeSettings(_cfg(4000, 3 * DAY, guardian));
        vm.stopPrank();
    }

    function test_guardian_cannotBecomeSafePlace() public {
        vm.prank(owner);
        vault.proposeSettings(_cfg(4000, 3 * DAY, guardian));
        KeepVault.Config memory c = _cfg(4000, 3 * DAY, guardian);
        c.safePlace = guardian;
        vm.prank(owner);
        vm.expectRevert(KeepVault.BadConfig.selector);
        vault.proposeSettings(c);
    }

    function test_guardian_nonGuardianReverts() public {
        _pay(vault, 100 * USDC);
        vm.prank(owner);
        vault.requestWithdraw(10 * USDC);
        vm.prank(stranger);
        vm.expectRevert(KeepVault.NotGuardian.selector);
        vault.guardianApprove();
    }

    // ── fuzz ───────────────────────────────────────────────────

    function testFuzz_split_conservesFunds(uint16 keepBps, uint96 amount) public {
        keepBps = uint16(bound(keepBps, 0, 10_000));
        KeepVault v = _newVault(_cfg(keepBps, 3 * DAY, address(0)));
        _pay(v, amount);
        assertEq(v.saved() + usdc.balanceOf(spend), amount);
        assertLe(v.saved(), CAP);
        assertEq(usdc.balanceOf(address(v)), v.saved());
    }
}
