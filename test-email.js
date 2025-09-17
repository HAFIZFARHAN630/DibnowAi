require('dotenv').config();
const sendEmail = require('./src/config/index');

async function testEmail() {
  try {
    console.log('Testing email configuration...');
    console.log('EMAIL_HOST:', process.env.EMAIL_HOST);
    console.log('EMAIL_PORT:', process.env.EMAIL_PORT);
    console.log('EMAIL_SECURE:', process.env.EMAIL_SECURE);
    console.log('EMAIL_USER:', process.env.EMAIL_USER);
    
    await sendEmail(
      process.env.EMAIL_USER, // Send to yourself for testing
      'Test Email Configuration',
      'Email_Confirmation',
      {
        name: 'Test User',
        otp: '123456',
        confirmationLink: 'http://localhost:3000/test',
        year: new Date().getFullYear()
      }
    );
    
    console.log('✅ Email sent successfully!');
  } catch (error) {
    console.error('❌ Email test failed:', error.message);
  }
}

testEmail();