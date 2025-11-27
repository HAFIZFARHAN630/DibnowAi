const mongoose = require('mongoose');
const Brand = require('./src/models/brand');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/dibnow', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

async function testBrandSave() {
  try {
    console.log('Testing brand save...');
    
    // Test with a sample user ID (replace with actual user ID)
    const testBrand = new Brand({
      name: 'Test Brand',
      description: 'Test Description',
      user_id: '6927eb4894dc1b3ecab96718' // Replace with actual user ID
    });

    const savedBrand = await testBrand.save();
    console.log('Brand saved successfully:', savedBrand);
    
    // Check if it exists in database
    const foundBrand = await Brand.findById(savedBrand._id);
    console.log('Found brand in database:', foundBrand);
    
    // Clean up - delete the test brand
    await Brand.findByIdAndDelete(savedBrand._id);
    console.log('Test brand deleted');
    
  } catch (error) {
    console.error('Error testing brand save:', error);
  } finally {
    mongoose.connection.close();
  }
}

testBrandSave();