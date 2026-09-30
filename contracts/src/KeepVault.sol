// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Initializable} from "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import {ReentrancyGuardTransient} from "@openzeppelin/contracts/utils/ReentrancyGuardTransient.sol";
import {IAdvancePool} from "./interfaces/IAdvancePool.sol";

/// @title KeepVault
/// @notice One user's savings. Deployed as an EIP-1167 clone of a fixed
/// implementation; there is no upgrade path and no admin. Saved USDC only
/// ever leaves to the owner's `safePlace`, or to the pool to repay an advance.
contract KeepVault is Initializable, ReentrancyGuardTransient {
    using SafeERC20 for IERC20;

    struct Config {
        address spendTo; // where the spend share and advances go
        address safePlace; // the only destination for saved funds
        address guardian; // optional; can only speed up a release
        uint16 keepBps; // share kept, 0..10000
        uint32 cooldown; // waiting period in seconds
    }

    struct Pending {
        uint256 amount;
        uint64 requestedAt;
        uint64 releaseAt;
    }

    struct PendingSettings {
        Config next;
        uint64 applyAt;
    }

    uint16 public constant BPS = 10_000;
    /// The advance fee is capped at 3% in the pool; the vault reserves for it.
    uint16 public constant MAX_FEE_BPS = 300;
    uint32 public constant MAX_COOLDOWN = 30 days;

    // Shared by every clone: immutables live in the implementation's code.
    IERC20 public immutable usdc;
    uint256 public immutable depositCap;
    /// 1 day on mainnet; shorter on testnet so the flow can be tried in minutes.
    uint32 public immutable minCooldown;

    address public owner;
    IAdvancePool public pool;
    Config internal _config;
    uint256 public saved;
    Pending internal _pending;
    PendingSettings internal _pendingSettings;

    event Processed(address indexed vault, uint256 amount, uint256 repaid, uint256 spent, uint256 kept);
    event Advanced(address indexed vault, uint256 amount);
    event WithdrawRequested(address indexed vault, uint256 amount, uint64 releaseAt);
    event WithdrawCancelled(address indexed vault, uint256 amount);
    event Withdrawn(address indexed vault, uint256 amount, address to);
    event GuardianApproved(address indexed vault, address indexed guardian);
    event SettingsProposed(address indexed vault, uint64 applyAt);
    event SettingsApplied(address indexed vault);
    event ReleasedToPool(address indexed vault, uint256 amount);

    error NotOwner();
    error NotGuardian();
    error NotPool();
    error ZeroAddress();
    error ZeroAmount();
    error BadConfig();
    error AdvanceTooLarge();
    error AdvanceOpen();
    error WithdrawPending();
    error NoWithdrawPending();
    error ExceedsWithdrawable();
    error StillWaiting();
    error NoSettingsPending();
    error ExceedsOwed();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    constructor(IERC20 usdc_, uint256 depositCap_, uint32 minCooldown_) {
        if (address(usdc_) == address(0) || depositCap_ == 0) revert BadConfig();
        if (minCooldown_ == 0 || minCooldown_ > MAX_COOLDOWN) revert BadConfig();
        usdc = usdc_;
        depositCap = depositCap_;
        minCooldown = minCooldown_;
        // The implementation itself can never be initialised.
        _disableInitializers();
    }

    /// @notice Called once by the factory, in the same transaction as the clone.
    function initialize(address owner_, address pool_, Config calldata cfg) external initializer {
        if (owner_ == address(0) || pool_ == address(0)) revert ZeroAddress();
        _validate(cfg);
        owner = owner_;
        pool = IAdvancePool(pool_);
        _config = cfg;
    }

    // ── Deposits ────────────────────────────────────────────────

    /// @notice Splits USDC that has arrived since the last call. Anyone can call it.
    /// Repays an open advance first, then sends the spend share to `spendTo`
    /// and keeps the rest, up to the deposit cap.
    function process() external nonReentrant {
        uint256 incoming = usdc.balanceOf(address(this)) - saved;
        if (incoming == 0) return;

        uint256 owed = pool.owedNow(address(this));
        uint256 repaid = incoming < owed ? incoming : owed;
        uint256 rest = incoming - repaid;
        uint256 kept = (rest * _config.keepBps) / BPS;
        uint256 room = depositCap - saved; // saved never exceeds the cap
        if (kept > room) kept = room;
        uint256 spent = rest - kept;

        // Effects before any transfer out.
        saved += kept;
        emit Processed(address(this), incoming, repaid, spent, kept);

        if (repaid > 0) {
            usdc.forceApprove(address(pool), repaid);
            pool.repay(repaid);
        }
        if (spent > 0) usdc.safeTransfer(_config.spendTo, spent);
    }

    // ── Advance ─────────────────────────────────────────────────

    /// @notice Borrows `amount` from the pool, paid to `spendTo`. One at a time.
    /// With the 3% fee cap it may use at most half of the savings not already
    /// promised to a pending withdrawal.
    function advance(uint256 amount) external nonReentrant onlyOwner {
        if (amount == 0) revert ZeroAmount();
        if (pool.owedMax(address(this)) != 0) revert AdvanceOpen();
        uint256 free = saved - _pending.amount;
        // amount * 1.03 <= free / 2
        if (amount * (BPS + MAX_FEE_BPS) * 2 > free * BPS) revert AdvanceTooLarge();
        emit Advanced(address(this), amount);
        pool.lend(_config.spendTo, amount);
    }

    /// @notice Only the pool, after day 90 of an advance, and never more than is owed.
    function releaseToPool(uint256 amount) external nonReentrant {
        if (msg.sender != address(pool)) revert NotPool();
        if (amount > pool.owedNow(address(this)) || amount > saved) revert ExceedsOwed();
        saved -= amount;
        emit ReleasedToPool(address(this), amount);
        usdc.safeTransfer(address(pool), amount);
    }

    // ── Withdrawals ─────────────────────────────────────────────

    /// @notice Starts the waiting period for `amount`. One request at a time.
    function requestWithdraw(uint256 amount) external onlyOwner {
        if (amount == 0) revert ZeroAmount();
        if (_pending.amount != 0) revert WithdrawPending();
        if (amount > withdrawable()) revert ExceedsWithdrawable();
        uint64 now_ = _now();
        uint64 releaseAt = now_ + _config.cooldown;
        _pending = Pending(amount, now_, releaseAt);
        emit WithdrawRequested(address(this), amount, releaseAt);
    }

    function cancelWithdraw() external onlyOwner {
        uint256 amount = _pending.amount;
        if (amount == 0) revert NoWithdrawPending();
        delete _pending;
        emit WithdrawCancelled(address(this), amount);
    }

    /// @notice After the waiting period, sends the amount to `safePlace`, never to the caller.
    function executeWithdraw() external nonReentrant onlyOwner {
        Pending memory p = _pending;
        if (p.amount == 0) revert NoWithdrawPending();
        if (block.timestamp < p.releaseAt) revert StillWaiting();
        // An open advance stays covered even if one was taken after the request.
        if (saved - p.amount < pool.owedMax(address(this))) revert ExceedsWithdrawable();
        delete _pending;
        saved -= p.amount;
        address to = _config.safePlace;
        emit Withdrawn(address(this), p.amount, to);
        usdc.safeTransfer(to, p.amount);
    }

    /// @notice The guardian can release an existing request early. Nothing else.
    function guardianApprove() external {
        address g = _config.guardian;
        if (g == address(0) || msg.sender != g) revert NotGuardian();
        if (_pending.amount == 0) revert NoWithdrawPending();
        _pending.releaseAt = _now();
        emit GuardianApproved(address(this), g);
    }

    // ── Settings ────────────────────────────────────────────────

    /// @notice Stronger settings apply at once. Weaker ones wait out the current
    /// cooldown, which is what protects someone whose keys were stolen.
    /// A new proposal replaces any pending one; re-proposing the current
    /// settings cancels a pending change.
    function proposeSettings(Config calldata next) external onlyOwner {
        _validate(next);
        if (_isWeaker(next)) {
            uint64 applyAt = _now() + _config.cooldown;
            _pendingSettings = PendingSettings(next, applyAt);
            emit SettingsProposed(address(this), applyAt);
        } else {
            delete _pendingSettings;
            _config = next;
            emit SettingsApplied(address(this));
        }
    }

    function applySettings() external onlyOwner {
        uint64 applyAt = _pendingSettings.applyAt;
        if (applyAt == 0) revert NoSettingsPending();
        if (block.timestamp < applyAt) revert StillWaiting();
        _config = _pendingSettings.next;
        delete _pendingSettings;
        emit SettingsApplied(address(this));
    }

    // ── Views ───────────────────────────────────────────────────

    function config() external view returns (Config memory) {
        return _config;
    }

    function pendingWithdraw() external view returns (Pending memory) {
        return _pending;
    }

    function pendingSettings() external view returns (PendingSettings memory) {
        return _pendingSettings;
    }

    /// @notice Savings minus what an open advance could cost at most.
    function withdrawable() public view returns (uint256) {
        uint256 reserved = pool.owedMax(address(this));
        return saved > reserved ? saved - reserved : 0;
    }

    /// @notice USDC that has arrived but not been split yet.
    function unprocessed() external view returns (uint256) {
        return usdc.balanceOf(address(this)) - saved;
    }

    // ── Internal ────────────────────────────────────────────────

    function _now() internal view returns (uint64) {
        // forge-lint: disable-next-line(unsafe-typecast)
        return uint64(block.timestamp); // fits for billions of years
    }

    function _validate(Config calldata c) internal view {
        if (c.spendTo == address(0) || c.safePlace == address(0)) revert ZeroAddress();
        if (c.keepBps > BPS) revert BadConfig();
        if (c.cooldown < minCooldown || c.cooldown > MAX_COOLDOWN) revert BadConfig();
        // The guardian can never be paid.
        if (c.guardian != address(0) && (c.guardian == c.spendTo || c.guardian == c.safePlace)) revert BadConfig();
    }

    /// Weaker = shorter cooldown, a new spendTo or safePlace, a guardian removed
    /// or swapped, or a smaller share kept.
    function _isWeaker(Config calldata n) internal view returns (bool) {
        Config memory c = _config;
        if (n.cooldown < c.cooldown) return true;
        if (n.spendTo != c.spendTo || n.safePlace != c.safePlace) return true;
        if (c.guardian != address(0) && n.guardian != c.guardian) return true;
        if (n.keepBps < c.keepBps) return true;
        return false;
    }
}
