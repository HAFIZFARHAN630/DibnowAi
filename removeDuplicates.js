require('dotenv').config();
const mongoose = require('mongoose');
const Repair = require('./src/models/repair');

const dbUri = process.env.MONGODB_URI || process.env.DB_URI;

mongoose.connect(dbUri)
  .then(async () => {
    console.log('✅ Connected to database\n');
    
    const userId = '6927e89494870f4e0da81e12';
    
    // Find duplicates based on customer details
    const duplicates = await Repair.aggregate([
      { $match: { user_id: new mongoose.Types.ObjectId(userId) } },
      {
        $group: {
          _id: {
            fullName: "$fullName",
            mobileNumber: "$mobileNumber", 
            brand: "$brand",
            device: "$device"
          },
          docs: { $push: "$$ROOT" },
          count: { $sum: 1 }
        }
      },
      { $match: { count: { $gt: 1 } } }
    ]);
    
    console.log(`Found ${duplicates.length} duplicate groups`);
    
    let removedCount = 0;
    for (const group of duplicates) {
      console.log(`\nDuplicate: ${group._id.fullName} - ${group._id.brand}`);
      
      // Keep the first record, remove the rest
      const toKeep = group.docs[0];
      const toRemove = group.docs.slice(1);
      
      console.log(`Keeping: ${toKeep._id} (${toKeep.createdAt || 'no timestamp'})`);
      
      for (const doc of toRemove) {
        console.log(`Removing: ${doc._id} (${doc.createdAt || 'no timestamp'})`);
        await Repair.findByIdAndDelete(doc._id);
        removedCount++;
      }
    }
    
    console.log(`\n✅ Removed ${removedCount} duplicate records`);
    
    // Show remaining count
    const remaining = await Repair.countDocuments({ user_id: userId });
    console.log(`📊 Remaining repair records: ${remaining}`);
    
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Database connection error:', err.message);
    process.exit(1);
  });