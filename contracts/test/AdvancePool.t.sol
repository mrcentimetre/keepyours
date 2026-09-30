// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Test} from "forge-std/Test.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Clones} from "@openzeppelin/contracts/proxy/Clones.sol";
import {KeepVault} from "../src/KeepVault.sol";
import {KeepVaultFactory} from "../src/KeepVaultFactory.sol";
import {AdvancePool} from "../src/AdvancePool.sol";
import {MockUSDC} from "./mocks/Mocks.sol";

contract AdvancePoolTest is Test {
    uint256 constant USDC = 1e6;
    uint256 constant CAP = 200 * USDC;
    uint32 constant DAY = 1 days;
    uint32 constant PERIOD = 30 days;

    MockUSDC usdc;
    AdvancePool pool;
    KeepVault impl;
    KeepVaultFactory factory;
    KeepVault vault;

    address builder = makeAddr("builder");
    address feeSink = makeAddr("feeSink");
    address owner = makeAddr("owner");
    address spend = makeAddr("spend");
    address safe = makeAddr("safe");
    address payer = makeAddr("payer");
    address stranger = makeAddr("stranger");

    function setUp() public {
        usdc = new MockUSDC();
        // Deploy order from docs/CONTRACTS.md
        vm.startPrank(builder);
        pool = new AdvancePool(usdc, feeSink, PERIOD, 150, 300);
        impl = new KeepVault(usdc, CAP, DAY);
        factory = new KeepVaultFactory(address(impl), address(pool));
        pool.setFactory(factory);
        usdc.mint(builder, 500 * USDC);
        usdc.approve(address(pool), 500 * USDC);
        pool.fund(500 * USDC);
        vm.stopPrank();

        vault = _create(owner, 4000);
    }

    // ── helpers ────────────────────────────────────────────────

    function _cfg(uint16 keepBps) internal view returns (KeepVault.Config memory) {
        return
            KeepVault.Config({
                spendTo: spend, safePlace: safe, guardian: address(0), keepBps: keepBps, cooldown: 3 * DAY
            });
    }

    function _create(address who, uint16 keepBps) internal returns (KeepVault) {
        vm.prank(who);
        return KeepVault(factory.createVault(_cfg(keepBps)));
    }

    function _pay(KeepVault v, uint256 amount) internal {
        usdc.mint(payer, amount);
        vm.prank(payer);
        usdc.transfer(address(v), amount);
        v.process();
    }

    function _borrow(uint256 amount) internal {
        vm.prank(owner);
        vault.advance(amount);
    }

    // ── factory ────────────────────────────────────────────────

    function test_factory_landsAtPredictedAddressAndKeepsEarlyDeposit() public {
        address alice = makeAddr("alice");
        address predicted = factory.predictVault(alice);
        usdc.mint(predicted, 50 * USDC); // paid before the vault exists

        KeepVault v = _create(alice, 4000);
        assertEq(address(v), predicted);
        assertEq(v.owner(), alice);
        assertEq(address(v.pool()), address(pool));
        assertEq(factory.vaultOf(alice), predicted);
        assertTrue(factory.isVault(predicted));

        v.process();
        assertEq(v.saved(), 20 * USDC);
    }

    function test_factory_secondVaultReverts() public {
        vm.prank(owner);
        vm.expectRevert(KeepVaultFactory.VaultExists.selector);
        factory.createVault(_cfg(4000));
    }

    function test_factory_callerIsAlwaysOwner() public {
        address alice = makeAddr("alice");
        KeepVault v = _create(stranger, 4000);
        assertEq(v.owner(), stranger);
        assertEq(factory.vaultOf(alice), address(0));
        assertTrue(factory.predictVault(alice) != address(v));
    }

    function test_factory_isVaultOnlyForItsOwn() public {
        assertTrue(factory.isVault(address(vault)));
        assertFalse(factory.isVault(address(impl)));
        assertFalse(factory.isVault(stranger));
    }

    function test_factory_rejectsBadConfig() public {
        KeepVault.Config memory c = _cfg(4000);
        c.cooldown = 1 hours;
        vm.prank(stranger);
        vm.expectRevert(KeepVault.BadConfig.selector);
        factory.createVault(c);
    }

    // ── setFactory ─────────────────────────────────────────────

    function test_setFactory_onlyOnce() public {
        vm.prank(builder);
        vm.expectRevert(AdvancePool.FactoryAlreadySet.selector);
        pool.setFactory(KeepVaultFactory(stranger));
    }

    function test_setFactory_onlyOwner() public {
        AdvancePool p = new AdvancePool(usdc, feeSink, PERIOD, 150, 300);
        vm.prank(stranger);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, stranger));
        p.setFactory(factory);
    }

    function test_constructor_feeCappedAtThreePercent() public {
        vm.expectRevert(AdvancePool.BadConfig.selector);
        new AdvancePool(usdc, feeSink, PERIOD, 150, 301);
        vm.expectRevert(AdvancePool.BadConfig.selector);
        new AdvancePool(usdc, feeSink, PERIOD, 300, 150);
    }

    // ── lend ───────────────────────────────────────────────────

    function test_lend_paysSpendToAndRecords() public {
        _pay(vault, 100 * USDC); // saved 40
        _borrow(10 * USDC);
        assertEq(usdc.balanceOf(spend), 70 * USDC);
        (uint128 principal,) = pool.loans(address(vault));
        assertEq(principal, 10 * USDC);
        assertEq(pool.totalOutstanding(), 10 * USDC);
        assertEq(pool.owedMax(address(vault)), 103 * USDC / 10);
    }

    function test_lend_fakeVaultRefused() public {
        // A hand-made clone with the same code, not made by the factory.
        KeepVault fake = KeepVault(Clones.clone(address(impl)));
        fake.initialize(stranger, address(pool), _cfg(10_000));
        _pay(fake, 100 * USDC);
        vm.prank(stranger);
        vm.expectRevert(AdvancePool.NotVault.selector);
        fake.advance(10 * USDC);

        vm.prank(stranger);
        vm.expectRevert(AdvancePool.NotVault.selector);
        pool.lend(stranger, 1);
    }

    function test_lend_secondLoanRefusedByPool() public {
        _pay(vault, 100 * USDC);
        _borrow(5 * USDC);
        vm.prank(address(vault));
        vm.expectRevert(AdvancePool.LoanOpen.selector);
        pool.lend(spend, 1);
    }

    function test_lend_overLimitRefusedByPool() public {
        _pay(vault, 100 * USDC); // saved 40, limit ~19.4
        vm.prank(address(vault));
        vm.expectRevert(AdvancePool.OverLimit.selector);
        pool.lend(spend, 20 * USDC);
    }

    function test_lend_notEnoughLiquidity() public {
        vm.prank(builder);
        pool.withdrawUnlent(495 * USDC, builder);
        _pay(vault, 100 * USDC);
        vm.prank(owner);
        vm.expectRevert(AdvancePool.NotEnoughLiquidity.selector);
        vault.advance(10 * USDC);
    }

    // ── fee tiers ──────────────────────────────────────────────

    function _feeAfter(uint256 age) internal returns (uint256 fee) {
        _pay(vault, 100 * USDC);
        _borrow(10 * USDC);
        vm.warp(vm.getBlockTimestamp() + age);
        uint256 sinkBefore = usdc.balanceOf(feeSink);
        _pay(vault, 50 * USDC);
        fee = usdc.balanceOf(feeSink) - sinkBefore;
        assertEq(pool.owedNow(address(vault)), 0);
    }

    function test_fee_freeThroughDay30() public {
        assertEq(_feeAfter(PERIOD), 0);
    }

    function test_fee_onePointFiveFromDay31() public {
        assertEq(_feeAfter(PERIOD + 1), 15 * USDC / 100);
    }

    function test_fee_onePointFiveThroughDay60() public {
        assertEq(_feeAfter(2 * PERIOD), 15 * USDC / 100);
    }

    function test_fee_threeFromDay61() public {
        assertEq(_feeAfter(2 * PERIOD + 1), 3 * USDC / 10);
    }

    function test_fee_neverAboveThreePercent() public {
        assertEq(_feeAfter(3 * 365 days), 3 * USDC / 10);
    }

    function test_repay_partialThenRest() public {
        _pay(vault, 100 * USDC);
        _borrow(10 * USDC);
        vm.warp(vm.getBlockTimestamp() + PERIOD + 1);

        _pay(vault, 5 * USDC + 75_000); // 5 principal + 1.5%
        (uint128 left,) = pool.loans(address(vault));
        assertEq(left, 5 * USDC);
        assertEq(usdc.balanceOf(feeSink), 75_000);

        _pay(vault, 50 * USDC);
        assertEq(pool.owedNow(address(vault)), 0);
        assertEq(usdc.balanceOf(feeSink), 150_000);
        assertEq(pool.totalOutstanding(), 0);
    }

    function test_repay_notFromNonVault() public {
        vm.prank(stranger);
        vm.expectRevert(AdvancePool.NotVault.selector);
        pool.repay(1);
    }

    // ── settle ─────────────────────────────────────────────────

    function test_settle_beforeDay90Reverts() public {
        _pay(vault, 100 * USDC);
        _borrow(10 * USDC);
        vm.warp(vm.getBlockTimestamp() + 3 * PERIOD);
        vm.expectRevert(AdvancePool.TooEarly.selector);
        pool.settle(address(vault));
    }

    function test_settle_afterDay90TakesOwedFromSavings() public {
        _pay(vault, 100 * USDC); // saved 40
        _borrow(10 * USDC);
        vm.warp(vm.getBlockTimestamp() + 3 * PERIOD + 1);

        uint256 poolBefore = usdc.balanceOf(address(pool));
        vm.prank(stranger); // anyone
        pool.settle(address(vault));

        assertEq(vault.saved(), 40 * USDC - 103 * USDC / 10);
        assertEq(usdc.balanceOf(address(pool)), poolBefore + 10 * USDC);
        assertEq(usdc.balanceOf(feeSink), 3 * USDC / 10);
        assertEq(pool.owedNow(address(vault)), 0);
        assertEq(pool.totalOutstanding(), 0);
        assertEq(usdc.balanceOf(stranger), 0);
    }

    function test_settle_noLoanReverts() public {
        vm.expectRevert(AdvancePool.NoLoan.selector);
        pool.settle(address(vault));
    }

    // ── pool owner ─────────────────────────────────────────────

    function test_owner_withdrawsUnlentOnly() public {
        _pay(vault, 100 * USDC);
        _borrow(10 * USDC);
        uint256 vaultBefore = usdc.balanceOf(address(vault));

        vm.startPrank(builder);
        vm.expectRevert(AdvancePool.NotEnoughLiquidity.selector);
        pool.withdrawUnlent(490 * USDC + 1, builder);
        pool.withdrawUnlent(490 * USDC, builder);
        vm.stopPrank();

        assertEq(usdc.balanceOf(address(vault)), vaultBefore);
        assertEq(vault.saved(), 40 * USDC);
    }

    function test_owner_onlyOwnerMovesCapital() public {
        vm.prank(stranger);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, stranger));
        pool.withdrawUnlent(1, stranger);
    }

    // ── end to end ─────────────────────────────────────────────

    function test_journey_payAdvanceRepayWithdraw() public {
        _pay(vault, 100 * USDC); // 60 spend, 40 kept
        _borrow(19 * USDC); // max is ~19.4
        _pay(vault, 100 * USDC); // 19 repays (free), 81 splits: 48.6 / 32.4
        assertEq(vault.saved(), 72_400_000);
        assertEq(pool.totalOutstanding(), 0);

        vm.startPrank(owner);
        vault.requestWithdraw(vault.withdrawable());
        vm.warp(vm.getBlockTimestamp() + 3 * DAY);
        vault.executeWithdraw();
        vm.stopPrank();
        assertEq(usdc.balanceOf(safe), 72_400_000);
        assertEq(usdc.balanceOf(address(pool)), 500 * USDC);
    }
}
