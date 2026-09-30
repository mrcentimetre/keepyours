// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Script, console} from "forge-std/Script.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {KeepVault} from "../src/KeepVault.sol";
import {KeepVaultFactory} from "../src/KeepVaultFactory.sol";
import {AdvancePool} from "../src/AdvancePool.sol";

/// Deploys in the order from docs/CONTRACTS.md and seeds the pool with the
/// deployer's USDC. Timings come from env so testnet can use minutes:
///   MIN_COOLDOWN  shortest waiting period a vault may pick (default 1 day)
///   FEE_PERIOD    length of each fee tier (default 30 days)
///   DEPOSIT_CAP   max saved per vault, 6 decimals (default 200 USDC)
///   POOL_SEED     USDC to put in the pool (default: all the deployer has)
contract Deploy is Script {
    function run() external {
        uint256 key = _key();
        address deployer = vm.addr(key);
        IERC20 usdc = IERC20(vm.envAddress("USDC_ADDRESS"));
        address feeSink = vm.envAddress("FEE_SINK_ADDRESS");
        uint32 minCooldown = uint32(vm.envOr("MIN_COOLDOWN", uint256(1 days)));
        uint32 feePeriod = uint32(vm.envOr("FEE_PERIOD", uint256(30 days)));
        uint256 cap = vm.envOr("DEPOSIT_CAP", uint256(200e6));
        uint256 seed = vm.envOr("POOL_SEED", usdc.balanceOf(deployer));

        vm.startBroadcast(key);
        AdvancePool pool = new AdvancePool(usdc, feeSink, feePeriod, 150, 300);
        KeepVault impl = new KeepVault(usdc, cap, minCooldown);
        KeepVaultFactory factory = new KeepVaultFactory(address(impl), address(pool));
        pool.setFactory(factory);
        if (seed > 0) {
            usdc.approve(address(pool), seed);
            pool.fund(seed);
        }
        vm.stopBroadcast();

        console.log("deployer      ", deployer);
        console.log("AdvancePool   ", address(pool));
        console.log("KeepVault impl", address(impl));
        console.log("Factory       ", address(factory));
        console.log("pool seeded   ", seed);
        console.log("min cooldown s", minCooldown);
        console.log("fee period s  ", feePeriod);
    }

    /// Accepts the key with or without a 0x prefix.
    function _key() internal view returns (uint256) {
        string memory raw = vm.envString("DEPLOYER_PRIVATE_KEY");
        if (bytes(raw).length == 64) raw = string.concat("0x", raw);
        return vm.parseUint(raw);
    }
}
