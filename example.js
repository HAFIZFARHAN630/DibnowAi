const { sendMail } = require('./emailService');

// Example usage
async function sendEmailConfirmation() {
  const context = {
    name: 'John Doe',
    otp: '123456',
    confirmationLink: 'https://example.com/confirm',
    year: new Date().getFullYear()
  };

  await sendMail('Email_Confirmation', context, 'user@example.com', 'Confirm Your Email');
}

async function sendForgotPassword() {
  const context = {
    name: 'John Doe',
    otp: '789012',
    confirmationLink: 'https://example.com/reset',
    year: new Date().getFullYear()
  };

  await sendMail('forgot_password', context, 'user@example.com', 'Password Reset OTP');
}

async function sendLogoutEmail() {
  const context = {
    name: 'John Doe',
    reason: 'User requested logout',
    baseUrl: 'https://example.com',
    year: new Date().getFullYear()
  };

  await sendMail('logout_email', context, 'user@example.com', 'Logout Notification');
}