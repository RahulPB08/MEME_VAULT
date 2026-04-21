import { ethers } from "ethers";

async function main() {
  const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
  
  // The failing account
  const failingAccount = "0xD9Ca9C6aBF769D138d5c9F2851db18126956B720";
  
  const balance = await provider.getBalance(failingAccount);
  console.log("Balance of failing account:", ethers.formatEther(balance));
  
  const memeVaultAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
  
  const MEMEVAULT_ABI = [
    "function getMarketItem(uint256 tokenId) external view returns (tuple(uint256 tokenId, address seller, address owner, uint256 price, bool sold, bool active))"
  ];
  const memeVault = new ethers.Contract(memeVaultAddress, MEMEVAULT_ABI, provider);
  
  try {
    const item = await memeVault.getMarketItem(6);
    console.log("Item 6 details:", {
      seller: item.seller,
      owner: item.owner,
      price: ethers.formatEther(item.price),
      sold: item.sold,
      active: item.active
    });
  } catch (e) {
    console.log("Failed to get item 6:", e.message);
  }
}
main();
