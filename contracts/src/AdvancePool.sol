// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";
import {SafeCast} from "@openzeppelin/contracts/utils/math/SafeCast.sol";
import {ReentrancyGuardTransient} from "@openzeppelin/contracts/utils/ReentrancyGuardTransient.sol";
import {IAdvancePool} from "./interfaces/IAdvancePool.sol";
import {KeepVault} from "./KeepVault.sol";
import {KeepVaultFactory} from "./KeepVaultFactory.sol";

/// @title AdvancePool
/// @notice The builder's own capital, lent to genuine vaults against their
/// savings. Never holds user savings. The owner can add or remove unlent
/// capital and nothing else.
///
/// Fee: free for the first `period` (30 days on mainnet), then 1.5%, then 3%,
/// set by when each repayment lands. After three periods anyone can `settle`.
contract AdvancePool is IAdvancePool, Ownable, ReentrancyGuardTransient {
    using SafeERC20 for IERC20;

    struct Loan {
        uint128 principal; // still outstanding
        uint64 start;
    }

    uint16 public constant BPS = 10_000;
    uint16 public constant MAX_FEE_BPS = 300;

    IERC20 public immutable usdc;
    address public immutable feeSink;
    /// Length of each fee tier. 30 days on mainnet; shorter on testnet for the demo.
    uint32 public immutable period;
    uint16 public immutable midFeeBps; // second period
    uint16 public immutable lateFeeBps; // third period

    KeepVaultFactory public factory;
    mapping(address vault => Loan) public loans;

    // Accounting for the segregation invariant.
    uint256 public totalFunded;
    uint256 public totalWithdrawn;
    uint256 public totalOutstanding;

    event FactorySet(address factory);
    event Funded(uint256 amount);
    event UnlentWithdrawn(uint256 amount, address to);
    event Lent(address indexed vault, address to, uint256 amount);
    event AdvanceRepaid(address indexed vault, uint256 principal, uint256 fee);
    event Settled(address indexed vault, uint256 owed);

    error BadConfig();
    error ZeroAmount();
    error FactoryAlreadySet();
    error NotVault();
    error LoanOpen();
    error NoLoan();
    error OverLimit();
    error NotEnoughLiquidity();
    error TooEarly();

    modifier onlyVault() {
        if (address(factory) == address(0) || !factory.isVault(msg.sender)) revert NotVault();
        _;
    }

    constructor(IERC20 usdc_, address feeSink_, uint32 period_, uint16 midFeeBps_, uint16 lateFeeBps_)
        Ownable(msg.sender)
    {
        if (address(usdc_) == address(0) || feeSink_ == address(0) || period_ == 0) revert BadConfig();
        if (midFeeBps_ > lateFeeBps_ || lateFeeBps_ > MAX_FEE_BPS) revert BadConfig();
        usdc = usdc_;
        feeSink = feeSink_;
        period = period_;
        midFeeBps = midFeeBps_;
        lateFeeBps = lateFeeBps_;
    }

    /// @notice Breaks the deploy-order cycle. Works once, then is locked.
    function setFactory(KeepVaultFactory factory_) external onlyOwner {
        if (address(factory) != address(0)) revert FactoryAlreadySet();
        if (address(factory_) == address(0)) revert BadConfig();
        factory = factory_;
        emit FactorySet(address(factory_));
    }

    // ── Pool owner: unlent capital only ─────────────────────────

    function fund(uint256 amount) external onlyOwner {
        if (amount == 0) revert ZeroAmount();
        totalFunded += amount;
        emit Funded(amount);
        usdc.safeTransferFrom(msg.sender, address(this), amount);
    }

    /// @notice The pool only ever holds its own capital and repayments, so any
    /// balance is unlent capital. Vault savings never sit here.
    function withdrawUnlent(uint256 amount, address to) external onlyOwner {
        if (amount == 0) revert ZeroAmount();
        if (amount > usdc.balanceOf(address(this))) revert NotEnoughLiquidity();
        totalWithdrawn += amount;
        emit UnlentWithdrawn(amount, to);
        usdc.safeTransfer(to, amount);
    }

    // ── Vaults ──────────────────────────────────────────────────

    function lend(address to, uint256 amount) external nonReentrant onlyVault {
        if (amount == 0) revert ZeroAmount();
        if (loans[msg.sender].principal != 0) revert LoanOpen();
        // Double-check the 50% rule against the vault's own books.
        if (amount * (BPS + MAX_FEE_BPS) * 2 > KeepVault(msg.sender).saved() * BPS) revert OverLimit();
        if (amount > usdc.balanceOf(address(this))) revert NotEnoughLiquidity();

        loans[msg.sender] = Loan(SafeCast.toUint128(amount), _now());
        totalOutstanding += amount;
        emit Lent(msg.sender, to, amount);
        usdc.safeTransfer(to, amount);
    }

    /// @notice Pulls `amount` from the calling vault. Each repayment is split
    /// into principal and the fee for the day it lands.
    function repay(uint256 amount) external nonReentrant onlyVault {
        if (amount == 0) revert ZeroAmount();
        (uint256 principal, uint256 fee) = _record(msg.sender, amount);
        emit AdvanceRepaid(msg.sender, principal, fee);
        usdc.safeTransferFrom(msg.sender, address(this), amount);
        if (fee > 0) usdc.safeTransfer(feeSink, fee);
    }

    /// @notice After three periods, anyone can take what is owed from the
    /// borrower's savings. No penalty on top.
    function settle(address vault) external nonReentrant {
        Loan memory loan = loans[vault];
        if (loan.principal == 0) revert NoLoan();
        if (block.timestamp <= uint256(loan.start) + 3 * uint256(period)) revert TooEarly();

        uint256 owed = owedNow(vault);
        uint256 before = usdc.balanceOf(address(this));
        // The vault checks the amount against owedNow, so it must run before
        // the loan is booked. It only transfers USDC to this pool, and every
        // pool entry point is nonReentrant, so it cannot re-enter.
        // forge-lint: disable-next-line(reentrancy-no-eth)
        KeepVault(vault).releaseToPool(owed);
        uint256 received = usdc.balanceOf(address(this)) - before;

        (uint256 principal, uint256 fee) = _record(vault, received);
        // forge-lint: disable-next-line(reentrancy-events)
        emit AdvanceRepaid(vault, principal, fee);
        // forge-lint: disable-next-line(reentrancy-events)
        emit Settled(vault, owed);
        if (fee > 0) usdc.safeTransfer(feeSink, fee);
    }

    // ── Views ───────────────────────────────────────────────────

    function feeBpsNow(address vault) public view returns (uint16) {
        Loan memory loan = loans[vault];
        if (loan.principal == 0) return 0;
        uint256 age = block.timestamp - loan.start;
        if (age <= period) return 0;
        if (age <= 2 * uint256(period)) return midFeeBps;
        return lateFeeBps;
    }

    function owedNow(address vault) public view returns (uint256) {
        uint256 p = loans[vault].principal;
        return Math.mulDiv(p, BPS + feeBpsNow(vault), BPS, Math.Rounding.Ceil);
    }

    function owedMax(address vault) external view returns (uint256) {
        return Math.mulDiv(loans[vault].principal, BPS + MAX_FEE_BPS, BPS, Math.Rounding.Ceil);
    }

    // ── Internal ────────────────────────────────────────────────

    /// Splits `amount` into principal and fee at today's rate, and books it.
    function _record(address vault, uint256 amount) internal returns (uint256 principal, uint256 fee) {
        Loan storage loan = loans[vault];
        uint256 outstanding = loan.principal;
        if (outstanding == 0) revert NoLoan();
        if (amount > owedNow(vault)) revert OverLimit();

        principal = Math.mulDiv(amount, BPS, BPS + feeBpsNow(vault));
        if (principal > outstanding) principal = outstanding; // rounding on a full repayment
        fee = amount - principal;

        totalOutstanding -= principal;
        if (principal == outstanding) delete loans[vault];
        // forge-lint: disable-next-line(unsafe-typecast)
        else loan.principal = uint128(outstanding - principal);
    }

    function _now() internal view returns (uint64) {
        // forge-lint: disable-next-line(unsafe-typecast)
        return uint64(block.timestamp);
    }
}
