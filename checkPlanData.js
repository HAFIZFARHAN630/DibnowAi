require('dotenv').config();
const mongoose = require('mongoose');
const planModel = require('./src/models/plan.model');

mongoose.connect(process.env.MONGODB_URI || process.env.DB_URI)
  .then(async () => {
    console.log('Connected to database');
    
    const plans = await planModel.find({}, 'plan_name repairCustomer inStock category brand teams');
    
    console.log('\n=== ALL PLANS IN DATABASE ===');
    plans.forEach(plan => {
      console.log(`\nPlan: ${plan.plan_name}`);
      console.log(`  repairCustomer: ${plan.repairCustomer} (type: ${typeof plan.repairCustomer})`);
      console.log(`  inStock: ${plan.inStock} (type: ${typeof plan.inStock})`);
      console.log(`  category: ${plan.category} (type: ${typeof plan.category})`);
      console.log(`  brand: ${plan.brand} (type: ${typeof plan.brand})`);
      console.log(`  teams: ${plan.teams} (type: ${typeof plan.teams})`);
    });
    
    process.exit(0);
  })
  .catch(err => {
    console.error('Database connection error:', err);
    process.exit(1);
  });
