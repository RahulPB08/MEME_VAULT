import mongoose from 'mongoose';

async function main() {
  await mongoose.connect('mongodb://localhost:27017/memevault');
  const db = mongoose.connection.db;
  
  // Find the auction
  const auction = await db.collection('auctions').findOne({});
  if (auction) {
    // Find the seller user to get their walletAddress
    const seller = await db.collection('users').findOne({ _id: auction.seller });
    if (seller) {
      await db.collection('auctions').updateOne({ _id: auction._id }, { $set: { sellerAddress: seller.walletAddress } });
      console.log("Fixed auction sellerAddress!");
    }
  }
  process.exit(0);
}
main();
