require('dotenv').config();
const mongoose = require('mongoose');
const Repair = require('./src/models/repair');

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('Connected to database');
    
    // Find duplicates with same tracking ID
    const duplicates = await Repair.find({ random_id: 'RPR-20251127-RGSNII' }).sort({ _id: 1 });
    
    console.log(`Found ${duplicates.length} records with tracking ID: RPR-20251127-RGSNII`);
    
    if (duplicates.length > 1) {
      // Keep first record, delete the rest
      const toKeep = duplicates[0];
      const toDelete = duplicates.slice(1);
      
      console.log(`Keeping: ${toKeep._id}`);
      
      for (const record of toDelete) {
        await Repair.findByIdAndDelete(record._id);
        console.log(`Deleted: ${record._id}`);
      }
      
      console.log(`✅ Removed ${toDelete.length} duplicate records`);
    } else {
      console.log('No duplicates found');
    }
    
    process.exit(0);
  })
  .catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
  });