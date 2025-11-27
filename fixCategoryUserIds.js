require('dotenv').config();
const mongoose = require('mongoose');
const Category = require('./src/models/categories');

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('Connected to database');
    
    const targetUserId = '6927eb4894dc1b3ecab96718';
    
    // Get all categories
    const allCategories = await Category.find({});
    console.log(`\n=== ALL CATEGORIES (${allCategories.length} total) ===`);
    
    allCategories.forEach((cat, index) => {
      const userIdStr = cat.user_id ? cat.user_id.toString() : 'NO USER_ID';
      const isTargetUser = cat.user_id && cat.user_id.toString() === targetUserId;
      console.log(`${index + 1}. Name: "${cat.name}" | User: ${userIdStr} ${isTargetUser ? '✅ (TARGET USER)' : ''} | ID: ${cat._id}`);
    });
    
    // Find categories with valid names but wrong/missing user_id
    const validCategories = allCategories.filter(cat => 
      cat.name && cat.name !== 'undefined' && cat.name.trim() !== '' && 
      (!cat.user_id || cat.user_id.toString() !== targetUserId)
    );
    
    if (validCategories.length > 0) {
      console.log(`\n🔧 Found ${validCategories.length} valid categories with wrong user_id:`);
      validCategories.forEach(cat => {
        console.log(`  - "${cat.name}" (ID: ${cat._id}) - Current user: ${cat.user_id}`);
      });
      
      console.log(`\n❓ Do you want to fix these categories to belong to user ${targetUserId}? (Y/N)`);
      console.log('   This will make them appear in your dropdowns.');
      
      // For now, just show what would be fixed
      console.log('\n📋 To fix manually, run:');
      validCategories.forEach(cat => {
        console.log(`   Category.findByIdAndUpdate('${cat._id}', { user_id: '${targetUserId}' })`);
      });
    }
    
    process.exit(0);
  })
  .catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
  });