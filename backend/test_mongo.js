import mongoose from 'mongoose';

const nftSchema = new mongoose.Schema({
  auctionId: { type: Number, default: null }
});
const NFT = mongoose.model('NFT', nftSchema);

async function main() {
  await mongoose.connect('mongodb://localhost:27017/memevault');
  const nft = new NFT();
  await nft.save();
  
  try {
    nft.auctionId = new mongoose.Types.ObjectId();
    await nft.save();
    console.log("Saved successfully? Wait...");
  } catch (e) {
    console.error("Cast error:", e.message);
  }
  process.exit(0);
}
main();
