import mongoose from 'mongoose';
import { ethers } from 'ethers';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Setup Mongoose models manually since we are running outside the app
const userSchema = new mongoose.Schema({
  username: String,
  email: String,
  walletAddress: { type: String, unique: true },
  avatar: String,
  isVerified: { type: Boolean, default: false },
});
const User = mongoose.model('User', userSchema);

const nftSchema = new mongoose.Schema({
  tokenId: { type: Number, unique: true, sparse: true },
  name: String,
  description: String,
  image: String,
  ipfsHash: String,
  metadataUri: String,
  category: String,
  tags: [String],
  price: Number,
  priceInEth: String,
  creator: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  creatorAddress: String,
  ownerAddress: String,
  listed: Boolean,
  sold: Boolean,
  onAuction: Boolean,
  auctionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Auction' },
  history: Array,
});
const NFT = mongoose.model('NFT', nftSchema);

const auctionSchema = new mongoose.Schema({
  nft: { type: mongoose.Schema.Types.ObjectId, ref: 'NFT' },
  tokenId: Number,
  seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  startingPrice: String,
  startingPriceEth: String,
  reservePrice: String,
  highestBid: { type: String, default: '0' },
  endTime: Date,
  duration: Number,
  ended: { type: Boolean, default: false },
  cancelled: { type: Boolean, default: false },
});
const Auction = mongoose.model('Auction', auctionSchema);

const MEMEVAULT_ABI = [
  "function createToken(string memory tokenURI, uint256 price) external payable returns (uint256)",
  "function getListingPrice() external view returns (uint256)",
  "function getTotalMemes() external view returns (uint256)",
  "function getMarketItem(uint256 tokenId) external view returns (tuple(uint256 tokenId, address seller, address owner, uint256 price, bool sold, bool active))",
  "function cancelMarketItem(uint256 tokenId) external",
  "function approve(address to, uint256 tokenId) external",
];

const AUCTION_ABI = [
  "function createAuction(address nftContract, uint256 tokenId, uint256 startingPrice, uint256 reservePrice, uint256 duration) external returns (uint256)"
];

async function seed() {
  await mongoose.connect('mongodb://localhost:27017/memevault');
  console.log("Connected to MongoDB.");

  // Clear DB
  await User.deleteMany({});
  await NFT.deleteMany({});
  await Auction.deleteMany({});
  // Drop indexes just in case to avoid any duplicate key errors if there were lingering documents
  await NFT.collection.dropIndexes().catch(e => console.log('No indexes to drop'));
  console.log("Database cleared.");

  // Create Users
  const user1 = await User.create({
    username: 'DogeMaster',
    email: 'doge@example.com',
    walletAddress: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266', // Account #0 (Anvil)
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Doge',
    isVerified: true
  });
  
  const user2 = await User.create({
    username: 'PepeTheFrog',
    email: 'pepe@example.com',
    walletAddress: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8', // Account #1 (Anvil)
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Pepe',
  });
  console.log("Users created.");

  const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
  // Account #0 from Anvil
  const wallet1 = new ethers.Wallet("0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80", provider);
  // Account #1 from Anvil
  const wallet2 = new ethers.Wallet("0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d", provider);

  const memeVaultAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
  const auctionAddress = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";
  
  const memeVault1 = new ethers.Contract(memeVaultAddress, MEMEVAULT_ABI, wallet1);
  const auction1 = new ethers.Contract(auctionAddress, AUCTION_ABI, wallet1);
  
  const memeVault2 = new ethers.Contract(memeVaultAddress, MEMEVAULT_ABI, wallet2);

  const listingPrice = await memeVault1.getListingPrice();
  let nonce1 = await provider.getTransactionCount(wallet1.address);
  let nonce2 = await provider.getTransactionCount(wallet2.address);

  // Example NFTs
  const nftsToCreate = [
    {
      name: 'Nyan Cat Original',
      desc: 'The original pop-tart cat flying through space.',
      img: 'https://media.giphy.com/media/sIIhZliB2McAo/giphy.gif',
      cat: 'classic',
      priceEth: '0.05',
      creator: user1,
      wallet: wallet1,
      memeVault: memeVault1,
      getNonce: () => nonce1++,
    },
    {
      name: 'Doge to the Moon',
      desc: 'Much wow. Very crypto. So moon.',
      img: 'https://media.giphy.com/media/9C1nyePnovqlpEYFMD/giphy.gif',
      cat: 'dank',
      priceEth: '0.1',
      creator: user1,
      wallet: wallet1,
      memeVault: memeVault1,
      getNonce: () => nonce1++,
    },
    {
      name: 'Pepe Feels Good Man',
      desc: 'Feels good man.',
      img: 'https://media.giphy.com/media/3oriO13TbRJi4LSnQs/giphy.gif',
      cat: 'trending',
      priceEth: '0.02',
      creator: user2,
      wallet: wallet2,
      memeVault: memeVault2,
      getNonce: () => nonce2++,
    }
  ];

  for (const nft of nftsToCreate) {
    console.log(`Minting ${nft.name}...`);
    const priceWei = ethers.parseEther(nft.priceEth);
    const tx = await nft.memeVault.createToken(`ipfs://mock-uri-${Date.now()}`, priceWei, { 
      value: listingPrice, 
      nonce: nft.getNonce() 
    });
    const receipt = await tx.wait();
    
    // We get total memes for token id (assuming sequential sync minting)
    const total = await nft.memeVault.getTotalMemes();
    const tokenId = Number(total);

    await NFT.create({
      tokenId: tokenId,
      name: nft.name,
      description: nft.desc,
      image: nft.img,
      category: nft.cat,
      tags: [nft.cat, 'meme'],
      price: priceWei.toString(),
      priceInEth: nft.priceEth,
      creator: nft.creator._id,
      owner: nft.creator._id, // Will be updated if sold
      creatorAddress: nft.wallet.address,
      ownerAddress: nft.wallet.address,
      listed: true,
      sold: false,
      onAuction: false,
      history: [{ event: 'mint', from: '', to: nft.wallet.address, price: 0, txHash: receipt.hash }]
    });
    console.log(`Minted ${nft.name} with Token ID ${tokenId}`);
  }

  // Let's create an auction for the first NFT (Nyan Cat)
  console.log("Setting up an auction for Nyan Cat...");
  const nyanCat = await NFT.findOne({ name: 'Nyan Cat Original' });
  
  // 1. Cancel listing
  const cancelTx = await memeVault1.cancelMarketItem(nyanCat.tokenId, { nonce: nonce1++ });
  await cancelTx.wait();
  
  // 2. Approve auction contract
  const approveTx = await memeVault1.approve(auctionAddress, nyanCat.tokenId, { nonce: nonce1++ });
  await approveTx.wait();
  
  // 3. Create auction on chain
  const startingPriceWei = ethers.parseEther("0.05");
  const duration = 86400 * 3; // 3 days
  const auctionTx = await auction1.createAuction(memeVaultAddress, nyanCat.tokenId, startingPriceWei, 0, duration, { nonce: nonce1++ });
  const auctionReceipt = await auctionTx.wait();
  
  // 4. Save auction to DB
  const auction = await Auction.create({
    nft: nyanCat._id,
    tokenId: nyanCat.tokenId,
    seller: user1._id,
    sellerAddress: wallet1.address,
    startingPrice: startingPriceWei.toString(),
    startingPriceEth: "0.05",
    reservePrice: "0",
    endTime: new Date(Date.now() + duration * 1000),
    duration: duration,
    nftContractAddress: memeVaultAddress,
    transactionHash: auctionReceipt.hash
  });
  
  // 5. Update NFT
  nyanCat.onAuction = true;
  nyanCat.auctionId = auction._id;
  nyanCat.listed = false;
  await nyanCat.save();
  console.log("Auction created successfully!");

  console.log("Seeding complete!");
  process.exit(0);
}

seed().catch(err => {
  console.error(err);
  process.exit(1);
});
