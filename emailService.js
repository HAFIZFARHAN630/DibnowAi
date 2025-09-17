const nodemailer = require('nodemailer');
const hbsModule = require('nodemailer-express-handlebars');
const hbs = hbsModule.default;
const path = require('path');
require('dotenv').config();

// Gmail SMTP Configuration
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER ? process.env.EMAIL_USER.replace(/"/g, '') : '',
    pass: process.env.EMAIL_PASS ? process.env.EMAIL_PASS.replace(/"/g, '') : ''
  }
});

// Handlebars Configuration
transporter.use('compile', hbs({
  viewEngine: {
    extname: '.hbs',
    defaultLayout: false
  },
  viewPath: path.join(__dirname, 'email-temp'),
  extName: '.hbs'
}));

// Email Functions
async function sendConfirmationEmail(userEmail, userName, otp) {
  const baseUrl = process.env.APP_BASE_URL || 'http://localhost:3000';
  const context = {
    name: userName,
    otp: otp,
    confirmationLink: `${baseUrl}/verify-email?email=${userEmail}&otp=${otp}`,
    loginUrl: `${baseUrl}/sign_in`,
    year: new Date().getFullYear()
  };

  return await transporter.sendMail({
    from: `${process.env.EMAIL_NAME ? process.env.EMAIL_NAME.replace(/"/g, '') : 'ClickTake Technologies'} <${process.env.EMAIL_USER ? process.env.EMAIL_USER.replace(/"/g, '') : ''}>`,
    to: userEmail,
    subject: 'Welcome! Confirm Your Email',
    template: 'Email_Confirmation',
    context: context
  });
}

async function sendForgotPasswordEmail(userEmail, userName, otp) {
  const baseUrl = process.env.APP_BASE_URL || 'http://localhost:3000';
  const context = {
    name: userName,
    otp: otp,
    email: userEmail,
    resetUrl: `${baseUrl}/forgot-password?email=${userEmail}&otp=${otp}`,
    year: new Date().getFullYear()
  };

  return await transporter.sendMail({
    from: `${process.env.EMAIL_NAME ? process.env.EMAIL_NAME.replace(/"/g, '') : 'ClickTake Technologies'} <${process.env.EMAIL_USER ? process.env.EMAIL_USER.replace(/"/g, '') : ''}>`,
    to: userEmail,
    subject: 'Password Reset OTP',
    template: 'forgot_password',
    context: context
  });
}

async function sendLogoutEmail(userEmail, userName, reason = 'Manual logout') {
  const baseUrl = process.env.APP_BASE_URL || 'http://localhost:3000';
  const context = {
    name: userName,
    logoutTime: new Date().toLocaleString('en-US', {
      timeZone: 'Asia/Karachi',
      dateStyle: 'full',
      timeStyle: 'short'
    }),
    link: `${baseUrl}/login`,
    reason: reason,
    year: new Date().getFullYear()
  };

  return await transporter.sendMail({
    from: `${process.env.EMAIL_NAME ? process.env.EMAIL_NAME.replace(/"/g, '') : 'ClickTake Technologies'} <${process.env.EMAIL_USER ? process.env.EMAIL_USER.replace(/"/g, '') : ''}>`,
    to: userEmail,
    subject: 'Logout Confirmation',
    template: 'logout_email',
    context: context
  });
}

module.exports = { sendConfirmationEmail, sendForgotPasswordEmail, sendLogoutEmail };