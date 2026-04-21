import mongoose from 'mongoose';

async function main() {
  await mongoose.connect('mongodb://localhost:27017/memevault');
  const db = mongoose.connection.db;
  
  try {
    await db.collection('users').dropIndex('walletAddress_1');
    console.log("Index dropped successfully!");
  } catch (e) {
    console.log("Error dropping index:", e.message);
  }
  
  process.exit(0);
}
main();
