const handlebars = require('handlebars');
const fs = require('fs');
const path = require('path');
const { brevoClient } = require('./emailConfig');
require("dotenv").config();

const APP_BASE_URL = process.env.APP_BASE_URL || "http://localhost:3000";

// Generic sendEmail function using Brevo API
async function sendEmail(templateName, toEmail, subject, context) {
    const templatePath = path.resolve('./email-temp', `${templateName}.hbs`);
    const templateSource = fs.readFileSync(templatePath, 'utf-8');
    const compiledTemplate = handlebars.compile(templateSource);
    const htmlContent = compiledTemplate(context);

    const emailData = {
        sender: { name: process.env.EMAIL_NAME, email: process.env.EMAIL_FROM },
        to: [{ email: toEmail }],
        subject: subject,
        htmlContent: htmlContent,
    };

    try {
        const response = await brevoClient.sendTransacEmail(emailData);
        console.log(`✅ [EMAIL] ${templateName} sent successfully`, response);
        return response;
    } catch (error) {
        console.error(`❌ [EMAIL] Failed to send ${templateName}:`, error);
        throw error;
    }
}

// 📩 Confirmation Email
async function sendConfirmationEmail(userEmail, userName, otp) {
    return sendEmail('Email_Confirmation', userEmail, 'Confirm Your Email - Dibnow', {
        name: userName,
        otp,
        confirmationLink: `${APP_BASE_URL}/verify-email?email=${userEmail}&otp=${otp}`,
        loginUrl: `${APP_BASE_URL}/sign_in`,
        year: new Date().getFullYear(),
    });
}

// 📩 Forgot Password Email
async function sendForgotPasswordEmail(userEmail, userName, otp) {
    return sendEmail('forgot_password', userEmail, 'Password Reset Request - Dibnow', {
        name: userName,
        otp,
        resetUrl: `${APP_BASE_URL}/reset-password?email=${userEmail}&otp=${otp}`,
        year: new Date().getFullYear(),
    });
}

// 📩 Logout Email
async function sendLogoutEmail(userEmail, userName, reason = 'Manual logout') {
    return sendEmail('logout_email', userEmail, 'Logout Notification - Dibnow', {
        name: userName,
        logoutTime: new Date().toLocaleString('en-US', { timeZone: 'Asia/Karachi' }),
        reason,
        link: `${APP_BASE_URL}/sign_in`,
        year: new Date().getFullYear(),
    });
}

module.exports = { sendConfirmationEmail, sendForgotPasswordEmail, sendLogoutEmail };