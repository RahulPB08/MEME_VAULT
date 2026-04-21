import { ethers } from "ethers";
const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
const wallet = new ethers.Wallet("0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80", provider);

const MEMEVAULT_ABI = [
  "function createToken(string memory tokenURI, uint256 price) external payable returns (uint256)",
  "function getListingPrice() external view returns (uint256)",
  "function getTotalMemes() external view returns (uint256)",
  "function getMarketItem(uint256 tokenId) external view returns (tuple(uint256 tokenId, address seller, address owner, uint256 price, bool sold, bool active))",
  "function cancelMarketItem(uint256 tokenId) external",
  "function approve(address to, uint256 tokenId) external",
  "function resellToken(uint256 tokenId, uint256 price) external payable"
];

const AUCTION_ABI = [
  "function createAuction(address nftContract, uint256 tokenId, uint256 startingPrice, uint256 reservePrice, uint256 duration) external returns (uint256)"
];

async function main() {
  const memeVaultAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
  const auctionAddress = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";
  
  const memeVault = new ethers.Contract(memeVaultAddress, MEMEVAULT_ABI, wallet);
  const auction = new ethers.Contract(auctionAddress, AUCTION_ABI, wallet);
  
  console.log("Listing price:", await memeVault.getListingPrice());
  
  console.log("Minting NFT...");
  try {
    let nonce = await provider.getTransactionCount(wallet.address);
    const tx = await memeVault.createToken("ipfs://test", ethers.parseEther("0.1"), { value: ethers.parseEther("0.0015"), nonce: nonce++ });
    const receipt = await tx.wait();
    console.log("Minted! Hash:", receipt.hash);
    
    console.log("Total memes:", await memeVault.getTotalMemes());
    
    // Now start auction
    const tokenId = await memeVault.getTotalMemes();
    
    // Cancel listing first if active
    const marketItem = await memeVault.getMarketItem(tokenId);
    console.log("Market item active:", marketItem.active);
    
    if (marketItem.active) {
      console.log("Cancelling market item...");
      const cancelTx = await memeVault.cancelMarketItem(tokenId, { nonce: nonce++ });
      await cancelTx.wait();
      console.log("Cancelled.");
    }
    
    console.log("Approving auction contract...");
    const approveTx = await memeVault.approve(auctionAddress, tokenId, { nonce: nonce++ });
    await approveTx.wait();
    console.log("Approved.");
    
    console.log("Creating auction...");
    const auctionTx = await auction.createAuction(memeVaultAddress, tokenId, ethers.parseEther("0.1"), 0, 86400, { nonce: nonce++ });
    await auctionTx.wait();
    console.log("Auction created!");
  } catch (e) {
    console.error("Error:", e);
  }
}
main();
