const { sendTemplateEmail } = require('./emailConfig');

// Email Confirmation template example
async function sendConfirmationEmail() {
  const context = {
    name: 'John Doe',
    otp: '123456',
    link: 'https://yourwebsite.com/confirm'
  };

  try {
    await sendTemplateEmail('Email_Confirmation', context, 'user@example.com', 'Email Confirmation');
    console.log('Email sent successfully!');
  } catch (error) {
    console.error('Error sending email:', error);
  }
}

// Future templates ke liye example
async function sendForgotPasswordEmail() {
  const context = {
    name: 'John Doe',
    otp: '789012',
    link: 'https://yourwebsite.com/reset-password'
  };

  await sendTemplateEmail('ForgotPassword', context, 'user@example.com', 'Reset Password');
}

// Function call
sendConfirmationEmail();