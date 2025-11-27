require('dotenv').config();
const mongoose = require('mongoose');
const Repair = require('./src/models/repair');

const dbUri = process.env.MONGODB_URI || process.env.DB_URI;

mongoose.connect(dbUri)
  .then(async () => {
    console.log('✅ Connected to database\n');
    
    const userId = '6927e89494870f4e0da81e12';
    
    // Get all repair records for this user
    const repairs = await Repair.find({ user_id: userId }).sort({ _id: -1 });
    
    console.log(`=== REPAIR RECORDS FOR USER (${repairs.length} total) ===`);
    
    // Group by potential duplicate fields
    const duplicateGroups = {};
    
    repairs.forEach((repair, index) => {
      const key = `${repair.fullName}-${repair.mobileNumber}-${repair.brand}-${repair.device}`;
      
      if (!duplicateGroups[key]) {
        duplicateGroups[key] = [];
      }
      duplicateGroups[key].push({
        id: repair._id,
        fullName: repair.fullName,
        mobileNumber: repair.mobileNumber,
        brand: repair.brand,
        device: repair.device,
        random_id: repair.random_id,
        createdAt: repair._id.getTimestamp(),
        status: repair.status
      });
    });
    
    // Show duplicates
    let duplicateCount = 0;
    Object.keys(duplicateGroups).forEach(key => {
      if (duplicateGroups[key].length > 1) {
        duplicateCount++;
        console.log(`\n🔄 DUPLICATE GROUP ${duplicateCount}:`);
        console.log(`Key: ${key}`);
        duplicateGroups[key].forEach((repair, index) => {
          console.log(`  ${index + 1}. ID: ${repair.id} | Created: ${repair.createdAt.toISOString()} | Tracking: ${repair.random_id} | Status: ${repair.status}`);
        });
      }
    });
    
    if (duplicateCount === 0) {
      console.log('✅ No duplicates found');
    } else {
      console.log(`\n❌ Found ${duplicateCount} duplicate groups`);
    }
    
    // Show recent records
    console.log('\n=== RECENT 5 RECORDS ===');
    repairs.slice(0, 5).forEach((repair, index) => {
      console.log(`${index + 1}. ${repair.fullName} | ${repair.mobileNumber} | ${repair.brand} | ${repair.random_id} | ${repair._id.getTimestamp().toISOString()}`);
    });
    
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Database connection error:', err.message);
    process.exit(1);
  });