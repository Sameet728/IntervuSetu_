const mongoose = require('mongoose');

async function check() {
  await mongoose.connect('mongodb://sameetpisal_db_user:J7ONnTPhYLnpoUDY@ac-u13ggvv-shard-00-00.cwxk15w.mongodb.net:27017,ac-u13ggvv-shard-00-01.cwxk15w.mongodb.net:27017,ac-u13ggvv-shard-00-02.cwxk15w.mongodb.net:27017/?ssl=true&replicaSet=atlas-88bpdr-shard-0&authSource=admin&appName=Cluster0');
  const db = mongoose.connection.db;
  const attempts = await db.collection('aptitudeattempts').find({ 
    testId: new mongoose.Types.ObjectId('6a12bf0330422477835a1600'),
    status: { $in: ['completed', 'auto_submitted'] }
  }).toArray();
  console.log('Attempts for test:', attempts.length);
  for (const a of attempts) {
    console.log(`- ID: ${a._id}, userId: ${a.userId}`);
    const user = await db.collection('users').findOne({ _id: a.userId });
    console.log(`  User details:`, user ? `${user.name} / ${user.email}` : 'NOT FOUND');
  }
  await mongoose.disconnect();
}
check().catch(console.error);
