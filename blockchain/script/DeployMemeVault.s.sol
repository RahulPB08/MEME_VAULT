// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {MemeVault}        from "../src/MemeVault.sol";
import {MemeVaultAuction} from "../src/MemeVaultAuction.sol";
import {MemeVaultOffers}  from "../src/MemeVaultOffers.sol";

/// @title DeployMemeVault — Foundry deployment script
/// @notice Deploys all three MemeVault contracts and logs their addresses
contract DeployMemeVault is Script {
    function run()
        external
        returns (
            MemeVault        vault,
            MemeVaultAuction auction,
            MemeVaultOffers  offersContract
        )
    {
        // Load deployer private key from environment variable PRIVATE_KEY
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");

        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy main NFT + marketplace
        vault = new MemeVault();

        // 2. Deploy auction house
        auction = new MemeVaultAuction();

        // 3. Deploy off-market offers
        offersContract = new MemeVaultOffers();

        vm.stopBroadcast();

        // Log addresses
        console.log("=== MemeVault Deployment ===");
        console.log("MemeVault (NFT + Market) :", address(vault));
        console.log("MemeVaultAuction         :", address(auction));
        console.log("MemeVaultOffers          :", address(offersContract));
    }
}
