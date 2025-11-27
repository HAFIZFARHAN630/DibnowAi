require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/user');
const Repair = require('./src/models/repair');

const dbUri = process.env.MONGODB_URI || process.env.DB_URI;

mongoose.connect(dbUri)
  .then(async () => {
    console.log('✅ Connected to database\n');
    
    const userId = '6927e89494870f4e0da81e12';
    
    // Check user data
    const user = await User.findById(userId).select('plan_name planLimits plan_limit');
    console.log('=== USER DATA ===');
    console.log(`Plan Name: ${user?.plan_name}`);
    console.log(`Plan Limit (old): ${user?.plan_limit}`);
    console.log(`Plan Limits (new):`, user?.planLimits);
    
    // Check existing repair records
    const repairCount = await Repair.countDocuments({ user_id: userId });
    console.log(`\n=== REPAIR RECORDS ===`);
    console.log(`Current repair count: ${repairCount}`);
    
    if (repairCount > 0) {
      const repairs = await Repair.find({ user_id: userId }).select('fullName device createdAt');
      console.log('Existing repairs:');
      repairs.forEach((repair, i) => {
        console.log(`  ${i+1}. ${repair.fullName} - ${repair.device} (${repair.createdAt})`);
      });
    }
    
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Database connection error:', err.message);
    process.exit(1);
  });