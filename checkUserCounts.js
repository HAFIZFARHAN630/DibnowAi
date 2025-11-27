require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/user');
const Repair = require('./src/models/repair');
const Inventory = require('./src/models/inventery');
const Brand = require('./src/models/brand');
const Category = require('./src/models/categories');

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('Connected to database');
    
    const userId = '6927eb4894dc1b3ecab96718';
    
    // Get current counts
    const [user, repairCount, inventoryCount, brandCount, categoryCount] = await Promise.all([
      User.findById(userId).select('plan_name planLimits'),
      Repair.countDocuments({ user_id: userId }),
      Inventory.countDocuments({ user_id: userId }),
      Brand.countDocuments({ user_id: userId }),
      Category.countDocuments({ user_id: userId })
    ]);
    
    console.log('=== USER PLAN & LIMITS ===');
    console.log('Plan:', user.plan_name);
    console.log('Plan Limits:', user.planLimits);
    
    console.log('\n=== CURRENT USAGE ===');
    console.log(`Repair Customers: ${repairCount}/${user.planLimits.repairCustomer}`);
    console.log(`Inventory Items: ${inventoryCount}/${user.planLimits.inStock}`);
    console.log(`Brands: ${brandCount}/${user.planLimits.brand}`);
    console.log(`Categories: ${categoryCount}/${user.planLimits.category}`);
    
    console.log('\n=== STATUS ===');
    console.log(`Repair: ${repairCount >= user.planLimits.repairCustomer ? '🚫 BLOCKED' : '✅ Available'}`);
    console.log(`Inventory: ${inventoryCount >= user.planLimits.inStock ? '🚫 BLOCKED' : '✅ Available'}`);
    console.log(`Brands: ${brandCount >= user.planLimits.brand ? '🚫 BLOCKED' : '✅ Available'}`);
    console.log(`Categories: ${categoryCount >= user.planLimits.category ? '🚫 BLOCKED' : '✅ Available'}`);
    
    // Show existing brands
    const brands = await Brand.find({ user_id: userId });
    console.log('\n=== EXISTING BRANDS ===');
    brands.forEach((brand, index) => {
      console.log(`${index + 1}. ${brand.name} (ID: ${brand._id})`);
    });
    
    process.exit(0);
  })
  .catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
  });