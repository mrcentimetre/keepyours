// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Test} from "forge-std/Test.sol";
import {KeepVault} from "../../src/KeepVault.sol";
import {AdvancePool} from "../../src/AdvancePool.sol";
import {WatchedUSDC} from "./WatchedUSDC.sol";

/// Drives random sequences of deposits, splits, advances, withdrawals,
/// settings changes, time jumps and settles across several users. Every call
/// is bounded or wrapped so an expected refusal never ends the run, and the
/// ghost counters record anything that should never happen.
contract Handler is Test {
    uint16 constant BPS = 10_000;

    WatchedUSDC public usdc;
    AdvancePool public pool;
    address public builder;
    KeepVault[] public vaults;
    address[] public owners;
    address[] public guardians;

    // ghosts
    uint256 public lentTotal;
    uint256 public calls;
    uint256 public crossVaultDrops; // invariant 9
    uint256 public earlyReleases; // invariant 5
    uint256 public earlySettings; // invariant 6
    uint256 public guardianPaid; // invariant 7
    uint256 public wrongWithdrawTarget; // invariant 1: withdrawals land in safePlace
    // how often each path actually succeeded, so a green run means something
    uint256 public advances;
    uint256 public repaidOnProcess;
    uint256 public withdrawals;
    uint256 public weakerProposed;
    uint256 public settingsApplied;
    uint256 public settles;
    mapping(address => bool) public guardianApproved;
    mapping(address => uint64) public proposedAt;
    mapping(address => uint32) public cooldownAtProposal;

    constructor(
        WatchedUSDC usdc_,
        AdvancePool pool_,
        address builder_,
        KeepVault[] memory vaults_,
        address[] memory guardians_
    ) {
        usdc = usdc_;
        pool = pool_;
        builder = builder_;
        for (uint256 i; i < vaults_.length; i++) {
            vaults.push(vaults_[i]);
            owners.push(vaults_[i].owner());
            guardians.push(guardians_[i]);
        }
    }

    function vaultCount() external view returns (uint256) {
        return vaults.length;
    }

    /// Nothing done to one vault may lower another vault's balance.
    modifier onVault(uint256 seed) {
        calls++;
        uint256 i = seed % vaults.length;
        uint256[] memory before = new uint256[](vaults.length);
        for (uint256 j; j < vaults.length; j++) {
            before[j] = usdc.balanceOf(address(vaults[j]));
        }
        _;
        for (uint256 j; j < vaults.length; j++) {
            if (j != i && usdc.balanceOf(address(vaults[j])) < before[j]) crossVaultDrops++;
        }
    }

    function _v(uint256 seed) internal view returns (KeepVault) {
        return vaults[seed % vaults.length];
    }

    function _owner(uint256 seed) internal view returns (address) {
        return owners[seed % vaults.length];
    }

    // ── actions ────────────────────────────────────────────────

    function pay(uint256 seed, uint256 amount, bool thenProcess) external onVault(seed) {
        amount = bound(amount, 1, 300e6);
        usdc.mint(address(_v(seed)), amount);
        if (thenProcess) _v(seed).process();
    }

    function process(uint256 seed) external onVault(seed) {
        uint256 g = usdc.balanceOf(guardians[seed % vaults.length]);
        uint256 owed = pool.owedNow(address(_v(seed)));
        _v(seed).process();
        if (pool.owedNow(address(_v(seed))) < owed) repaidOnProcess++;
        if (usdc.balanceOf(guardians[seed % vaults.length]) > g) guardianPaid++;
    }

    function advance(uint256 seed, uint256 amount) external onVault(seed) {
        KeepVault v = _v(seed);
        uint256 max = (v.saved() - v.pendingWithdraw().amount) * BPS / ((BPS + 300) * 2);
        if (max == 0) return;
        amount = bound(amount, 1, max);
        vm.prank(_owner(seed));
        try v.advance(amount) {
            advances++;
            lentTotal += amount;
        } catch {}
    }

    function requestWithdraw(uint256 seed, uint256 amount) external onVault(seed) {
        KeepVault v = _v(seed);
        uint256 max = v.withdrawable();
        if (max == 0) return;
        amount = bound(amount, 1, max);
        vm.prank(_owner(seed));
        try v.requestWithdraw(amount) {
            guardianApproved[address(v)] = false;
        } catch {}
    }

    function cancelWithdraw(uint256 seed) external onVault(seed) {
        vm.prank(_owner(seed));
        try _v(seed).cancelWithdraw() {} catch {}
    }

    function executeWithdraw(uint256 seed, bool wait) external onVault(seed) {
        KeepVault v = _v(seed);
        KeepVault.Pending memory p = v.pendingWithdraw();
        if (wait && p.amount > 0 && block.timestamp < p.releaseAt) vm.warp(p.releaseAt);
        address safePlace = v.config().safePlace;
        uint256 safeBefore = usdc.balanceOf(safePlace);
        vm.prank(_owner(seed));
        try v.executeWithdraw() {
            withdrawals++;
            if (usdc.balanceOf(safePlace) != safeBefore + p.amount) wrongWithdrawTarget++;
            if (block.timestamp < p.releaseAt) earlyReleases++;
            if (!guardianApproved[address(v)] && p.releaseAt - p.requestedAt < v.minCooldown()) earlyReleases++;
        } catch {}
    }

    function guardianApprove(uint256 seed) external onVault(seed) {
        KeepVault v = _v(seed);
        vm.prank(guardians[seed % vaults.length]);
        try v.guardianApprove() {
            guardianApproved[address(v)] = true;
        } catch {}
    }

    /// Random mix of stronger and weaker changes. Addresses stay the owner's own.
    function proposeSettings(uint256 seed, uint32 cooldown, uint16 keepBps, bool moveSafe, bool dropGuardian)
        external
        onVault(seed)
    {
        KeepVault v = _v(seed);
        KeepVault.Config memory c = v.config();
        c.cooldown = uint32(bound(cooldown, v.minCooldown(), v.MAX_COOLDOWN()));
        c.keepBps = uint16(bound(keepBps, 0, BPS));
        if (moveSafe) c.safePlace = address(uint160(c.safePlace) ^ 1);
        if (dropGuardian) c.guardian = address(0);
        else if (c.guardian == address(0)) c.guardian = guardians[seed % vaults.length];
        KeepVault.Config memory cur = v.config();
        // The spec's definition of weaker, written independently of the contract.
        bool weaker = c.cooldown < cur.cooldown || c.safePlace != cur.safePlace || c.spendTo != cur.spendTo
            || (cur.guardian != address(0) && c.guardian != cur.guardian) || c.keepBps < cur.keepBps;
        vm.prank(_owner(seed));
        try v.proposeSettings(c) {
            proposedAt[address(v)] = uint64(block.timestamp);
            cooldownAtProposal[address(v)] = cur.cooldown;
            if (weaker) {
                weakerProposed++;
                // a weaker change must not have taken effect straight away
                if (keccak256(abi.encode(v.config())) != keccak256(abi.encode(cur))) earlySettings++;
            }
        } catch {}
    }

    function applySettings(uint256 seed, bool wait) external onVault(seed) {
        KeepVault v = _v(seed);
        uint64 applyAt = v.pendingSettings().applyAt;
        if (wait && applyAt > block.timestamp) vm.warp(applyAt);
        vm.prank(_owner(seed));
        try v.applySettings() {
            settingsApplied++;
            if (block.timestamp < uint256(proposedAt[address(v)]) + cooldownAtProposal[address(v)]) earlySettings++;
        } catch {}
    }

    function settle(uint256 seed, bool wait) external onVault(seed) {
        (, uint64 start) = pool.loans(address(_v(seed)));
        uint256 due = uint256(start) + 3 * uint256(pool.period()) + 1;
        if (wait && start > 0 && block.timestamp < due) vm.warp(due);
        try pool.settle(address(_v(seed))) {
            settles++;
        } catch {}
    }

    function warp(uint256 secs) external {
        calls++;
        vm.warp(block.timestamp + bound(secs, 0, 40 days));
    }

    // The pool owner moving unlent capital must never touch a vault.
    function poolWithdraw(uint256 amount) external onVault(0) {
        uint256 bal = usdc.balanceOf(address(pool));
        if (bal == 0) return;
        amount = bound(amount, 1, bal);
        vm.prank(builder);
        pool.withdrawUnlent(amount, builder);
    }

    function poolFund(uint256 amount) external onVault(0) {
        amount = bound(amount, 1, 1_000e6);
        usdc.mint(builder, amount);
        vm.startPrank(builder);
        usdc.approve(address(pool), amount);
        pool.fund(amount);
        vm.stopPrank();
    }
}
