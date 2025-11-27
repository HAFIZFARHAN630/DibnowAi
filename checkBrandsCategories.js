require('dotenv').config();
const mongoose = require('mongoose');
const Brand = require('./src/models/brand');
const Category = require('./src/models/categories');

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('Connected to database');
    
    const userId = '6927eb4894dc1b3ecab96718';
    
    // Also check all categories to see if there are new ones
    console.log('\n=== ALL CATEGORIES IN DATABASE ===');
    const allCategories = await Category.find({});
    console.log(`Total categories in database: ${allCategories.length}`);
    allCategories.forEach((cat, index) => {
      console.log(`${index + 1}. Name: "${cat.name}" | User: ${cat.user_id} | ID: ${cat._id}`);
    });
    
    // Get brands and categories for this user
    const [brands, categories] = await Promise.all([
      Brand.find({ user_id: userId }),
      Category.find({ user_id: userId })
    ]);
    
    console.log('\n=== BRANDS ===');
    console.log(`Found ${brands.length} brands:`);
    brands.forEach((brand, index) => {
      console.log(`${index + 1}. Name: "${brand.name}" | Description: "${brand.description}" | ID: ${brand._id}`);
    });
    
    console.log('\n=== CATEGORIES ===');
    console.log(`Found ${categories.length} categories:`);
    categories.forEach((category, index) => {
      console.log(`${index + 1}. Name: "${category.name}" | Description: "${category.description}" | ID: ${category._id}`);
    });
    
    // Check if any have empty names
    const emptyBrands = brands.filter(b => !b.name || b.name.trim() === '');
    const emptyCategories = categories.filter(c => !c.name || c.name.trim() === '');
    
    if (emptyBrands.length > 0) {
      console.log(`\n⚠️ Found ${emptyBrands.length} brands with empty names`);
    }
    
    if (emptyCategories.length > 0) {
      console.log(`\n⚠️ Found ${emptyCategories.length} categories with empty names`);
    }
    
    process.exit(0);
  })
  .catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
  });