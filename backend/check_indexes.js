import mongoose from 'mongoose';

async function main() {
  await mongoose.connect('mongodb://localhost:27017/memevault');
  const db = mongoose.connection.db;
  
  const indexes = await db.collection('users').indexes();
  console.log(JSON.stringify(indexes, null, 2));
  
  process.exit(0);
}
main();
