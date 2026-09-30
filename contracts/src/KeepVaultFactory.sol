// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Clones} from "@openzeppelin/contracts/proxy/Clones.sol";
import {KeepVault} from "./KeepVault.sol";

/// @title KeepVaultFactory
/// @notice Makes each user's vault as a clone of one fixed implementation, at
/// an address known before it exists, and keeps the list of genuine vaults.
/// No owner and no admin functions.
contract KeepVaultFactory {
    address public immutable implementation;
    address public immutable pool;

    mapping(address owner => address vault) public vaultOf;
    mapping(address vault => bool) public isVault;

    event VaultCreated(address indexed owner, address vault, uint16 keepBps, uint32 cooldown);

    error ZeroAddress();
    error VaultExists();

    constructor(address implementation_, address pool_) {
        if (implementation_ == address(0) || pool_ == address(0)) revert ZeroAddress();
        implementation = implementation_;
        pool = pool_;
    }

    /// @notice Creates the caller's vault. The caller is always the owner, so
    /// nobody can create (or squat) a vault for someone else.
    function createVault(KeepVault.Config calldata cfg) external returns (address vault) {
        if (vaultOf[msg.sender] != address(0)) revert VaultExists();
        vault = Clones.cloneDeterministic(implementation, _salt(msg.sender));
        vaultOf[msg.sender] = vault;
        isVault[vault] = true;
        emit VaultCreated(msg.sender, vault, cfg.keepBps, cfg.cooldown);
        KeepVault(vault).initialize(msg.sender, pool, cfg);
    }

    /// @notice The vault address for `owner`, before or after it exists.
    function predictVault(address owner) external view returns (address) {
        return Clones.predictDeterministicAddress(implementation, _salt(owner));
    }

    function _salt(address owner) internal pure returns (bytes32) {
        return bytes32(uint256(uint160(owner)));
    }
}
