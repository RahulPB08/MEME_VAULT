import mongoose from 'mongoose';
import User from './src/models/User.model.js';

async function main() {
  await mongoose.connect('mongodb://localhost:27017/memevault');
  const db = mongoose.connection.db;
  
  // Find users with walletAddress = null and unset it
  await db.collection('users').updateMany(
    { walletAddress: null },
    { $unset: { walletAddress: "" } }
  );
  console.log("Cleaned up null walletAddresses.");
  
  // Re-sync indexes just in case
  await User.syncIndexes();
  console.log("Indexes synced.");
  
  const indexes = await db.collection('users').indexes();
  console.log(JSON.stringify(indexes, null, 2));
  
  process.exit(0);
}
main();
