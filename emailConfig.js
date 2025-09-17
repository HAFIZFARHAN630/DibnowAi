const nodemailer = require('nodemailer');
const hbsModule = require('hbs');
const Handlebars = hbsModule.handlebars;
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT),
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER.replace(/"/g, ''),
    pass: process.env.EMAIL_PASS.replace(/"/g, '')
  }
});

async function sendConfirmationEmail(email, name) {
  const templatePath = path.resolve(__dirname, 'email-temp', 'Email_Confirmation.hbs');
  const templateSource = fs.readFileSync(templatePath, 'utf8');
  const template = Handlebars.compile(templateSource);
  const html = template({ name });

  return await transporter.sendMail({
    from: `${process.env.EMAIL_NAME.replace(/"/g, '')} <${process.env.EMAIL_USER.replace(/"/g, '')}>`,
    to: email,
    subject: 'Welcome! Account Created Successfully',
    html: html
  });
}

async function sendForgotPasswordEmail(email, name, otp) {
  const templatePath = path.resolve(__dirname, 'email-temp', 'forgot_password.hbs');
  const templateSource = fs.readFileSync(templatePath, 'utf8');
  const template = Handlebars.compile(templateSource);
  const html = template({ name, otp, email });

  return await transporter.sendMail({
    from: `${process.env.EMAIL_NAME.replace(/"/g, '')} <${process.env.EMAIL_USER.replace(/"/g, '')}>`,
    to: email,
    subject: 'Password Reset OTP',
    html: html
  });
}

async function sendLogoutEmail(email, name) {
  const templatePath = path.resolve(__dirname, 'email-temp', 'logout_email.hbs');
  const templateSource = fs.readFileSync(templatePath, 'utf8');
  const template = Handlebars.compile(templateSource);
  const html = template({ 
    name, 
    logoutTime: new Date().toLocaleString('en-US', { 
      timeZone: 'Asia/Karachi',
      dateStyle: 'full',
      timeStyle: 'short'
    }),
    link: 'http://localhost:3000/login'
  });

  return await transporter.sendMail({
    from: `${process.env.EMAIL_NAME.replace(/"/g, '')} <${process.env.EMAIL_USER.replace(/"/g, '')}>`,
    to: email,
    subject: 'Logout Notification',
    html: html
  });
}

module.exports = { sendConfirmationEmail, sendForgotPasswordEmail, sendLogoutEmail };