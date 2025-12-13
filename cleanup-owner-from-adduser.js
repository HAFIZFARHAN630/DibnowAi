const mongoose = require('mongoose');
const AddUser = require('./src/models/adduser');
const User = require('./src/models/user');

mongoose.connect('mongodb://localhost:27017/dibnow', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

async function cleanup() {
  try {
    // Find all owners in User table
    const owners = await User.find({}).select('email');
    console.log(`Found ${owners.length} owners in User table`);
    
    // Remove any owner emails from AddUser table
    for (const owner of owners) {
      const result = await AddUser.deleteMany({ email: owner.email });
      if (result.deletedCount > 0) {
        console.log(`✅ Removed ${result.deletedCount} entry for owner: ${owner.email}`);
      }
    }
    
    console.log('✅ Cleanup complete');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

cleanup();
