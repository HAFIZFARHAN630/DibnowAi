require('dotenv').config();
const mongoose = require('mongoose');
const PlanRequest = require('./src/models/planRequest');

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/dibnow')
  .then(async () => {
    console.log('Connected to MongoDB');
    
    const allRequests = await PlanRequest.find({}).populate('user');
    console.log('\n📋 Total PlanRequests:', allRequests.length);
    
    const pendingRequests = await PlanRequest.find({ 
      status: 'Pending',
      invoiceStatus: 'Unpaid'
    }).populate('user');
    console.log('📋 Pending & Unpaid Requests:', pendingRequests.length);
    
    console.log('\n📋 All Requests Details:');
    allRequests.forEach((req, index) => {
      console.log(`\n${index + 1}. Plan: ${req.planName}, Status: ${req.status}, Invoice: ${req.invoiceStatus}`);
      console.log(`   User: ${req.user ? req.user.first_name + ' ' + req.user.last_name : 'N/A'}`);
      console.log(`   Amount: ${req.amount}, Created: ${req.createdAt}`);
    });
    
    process.exit(0);
  })
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
