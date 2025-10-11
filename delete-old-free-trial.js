// Delete old Free Trial records
require('dotenv').config();
const mongoose = require('mongoose');
const PlanRequest = require('./src/models/planRequest');

async function deleteOldFreeTrial() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Delete all Free Trial PlanRequests
    const result = await PlanRequest.deleteMany({ 
      planName: { $in: ['Free Trial', 'FREE TRIAL'] }
    });

    console.log(`✅ Deleted ${result.deletedCount} Free Trial records`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

deleteOldFreeTrial();
