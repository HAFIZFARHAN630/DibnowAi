require('dotenv').config();
const { sendConfirmationEmail, sendForgotPasswordEmail } = require('./emailService');

async function testEmail() {
  try {
    console.log('Testing email configuration...');
    console.log('EMAIL_HOST:', process.env.EMAIL_HOST);
    console.log('EMAIL_PORT:', process.env.EMAIL_PORT);
    console.log('EMAIL_SECURE:', process.env.EMAIL_SECURE);
    console.log('EMAIL_USER:', process.env.EMAIL_USER);
    
    // Test confirmation email
    await sendConfirmationEmail('nowdib@gmail.com', 'Test User', '123456');
    console.log('✅ Confirmation email sent successfully!');
    
    // Test forgot password email
    await sendForgotPasswordEmail('nowdib@gmail.com', 'Test User', '123456');
    console.log('✅ Forgot password email sent successfully!');
    
  } catch (error) {
    console.error('❌ Email test failed:', error.message);
  }
}

testEmail();