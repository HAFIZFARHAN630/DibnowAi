const { sendConfirmationEmail, sendForgotPasswordEmail, sendLogoutEmail } = require('./emailService');

// Example Usage Functions

// 1. User Registration - Email Confirmation
async function handleUserRegistration(userEmail, userName) {
  try {
    await sendConfirmationEmail(userEmail, userName);
    console.log(`✅ Confirmation email sent to ${userEmail}`);
  } catch (error) {
    console.error('❌ Error sending confirmation email:', error.message);
  }
}

// 2. Forgot Password - OTP Verification  
async function handleForgotPassword(userEmail, userName) {
  const otp = Math.floor(100000 + Math.random() * 900000); // Generate 6-digit OTP
  
  try {
    await sendForgotPasswordEmail(userEmail, userName, otp);
    console.log(`✅ Password reset email sent to ${userEmail} with OTP: ${otp}`);
    return otp; // Store this OTP in database for verification
  } catch (error) {
    console.error('❌ Error sending password reset email:', error.message);
  }
}

// 3. User Logout - Logout Email
async function handleUserLogout(userEmail, userName) {
  try {
    await sendLogoutEmail(userEmail, userName);
    console.log(`✅ Logout confirmation email sent to ${userEmail}`);
  } catch (error) {
    console.error('❌ Error sending logout email:', error.message);
  }
}

// Test Functions (uncomment to test)
// handleUserRegistration('test@example.com', 'John Doe');
// handleForgotPassword('test@example.com', 'John Doe');
// handleUserLogout('test@example.com', 'John Doe');

module.exports = { handleUserRegistration, handleForgotPassword, handleUserLogout };