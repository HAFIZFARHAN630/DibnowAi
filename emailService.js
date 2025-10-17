const handlebars = require('handlebars');
const fs = require('fs');
const path = require('path');
const { mailtrapClient } = require('./emailConfig');
require("dotenv").config();

const APP_BASE_URL = process.env.APP_BASE_URL || "http://localhost:3000";

// Generic sendEmail function using Mailtrap API
async function sendEmail(templateName, toEmail, subject, context) {
    console.log(`🔍 [EMAIL] Preparing to send ${templateName} email`);
    console.log("   - To:", toEmail);
    console.log("   - Subject:", subject);

    const templatePath = path.resolve('./email-temp', `${templateName}.hbs`);
    console.log("🔍 [EMAIL] Template path:", templatePath);

    // Check if template file exists
    if (!fs.existsSync(templatePath)) {
        throw new Error(`Template file not found: ${templatePath}`);
    }

    const templateSource = fs.readFileSync(templatePath, 'utf-8');
    const compiledTemplate = handlebars.compile(templateSource);
    const htmlContent = compiledTemplate(context);

    console.log("🔍 [EMAIL] Template compiled successfully");
    console.log("🔍 [EMAIL] HTML content length:", htmlContent.length, "characters");

    const emailData = {
        sender: { name: process.env.EMAIL_NAME, email: process.env.EMAIL_FROM },
        to: [{ email: toEmail }],
        subject: subject,
        htmlContent: htmlContent,
    };

    console.log("🔍 [EMAIL] Sending via Mailtrap API...");
    console.log("   - From:", process.env.EMAIL_NAME, `<${process.env.EMAIL_FROM}>`);

    try {
        const response = await mailtrapClient.send({
            from: {
                email: process.env.EMAIL_FROM,
                name: process.env.EMAIL_NAME,
            },
            to: [{ email: toEmail }],
            subject: subject,
            html: htmlContent,
        });
        console.log(`✅ [EMAIL] ${templateName} sent successfully`);
        console.log("   - Message ID:", response.message_ids?.[0] || 'N/A');
        console.log("   - Response:", response);
        return response;
    } catch (error) {
        console.error(`❌ [EMAIL] Failed to send ${templateName}:`, error.message);
        console.error("❌ [EMAIL] Error code:", error.code || error.statusCode);
        console.error("❌ [EMAIL] Error response:", error.response?.data || error.response);
        console.error("❌ [EMAIL] Full error:", error);
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
    console.log("🔍 [DEBUG] sendForgotPasswordEmail called with:");
    console.log("   - Email:", userEmail);
    console.log("   - Name:", userName);
    console.log("   - OTP:", otp);
    console.log("   - APP_BASE_URL:", APP_BASE_URL);

    const templatePath = path.resolve('./email-temp', 'forgot_password.hbs');
    console.log("🔍 [DEBUG] Template path:", templatePath);
    console.log("🔍 [DEBUG] Template exists:", fs.existsSync(templatePath));

    const context = {
        name: userName,
        otp,
        resetUrl: `${APP_BASE_URL}/reset-password?email=${userEmail}&otp=${otp}`,
        year: new Date().getFullYear(),
    };

    console.log("🔍 [DEBUG] Template context:", JSON.stringify(context, null, 2));

    try {
        const result = await sendEmail('forgot_password', userEmail, 'Password Reset Request - Dibnow', context);
        console.log("✅ [DEBUG] Forgot password email sent successfully");
        console.log("   - Message ID:", result.messageId);
        console.log("   - Response:", result.response);
        return result;
    } catch (error) {
        console.error("❌ [DEBUG] Forgot password email sending failed:", error.message);
        console.error("❌ [DEBUG] Error code:", error.code);
        console.error("❌ [DEBUG] Error response:", error.response);
        throw error;
    }
}

// 📩 Logout Email
async function sendLogoutEmail(userEmail, userName, reason = 'Manual logout') {
    console.log("🔍 [DEBUG] sendLogoutEmail called with:");
    console.log("   - Email:", userEmail);
    console.log("   - Name:", userName);
    console.log("   - Reason:", reason);
    console.log("   - APP_BASE_URL:", APP_BASE_URL);

    const templatePath = path.resolve('./email-temp', 'logout_email.hbs');
    console.log("🔍 [DEBUG] Template path:", templatePath);
    console.log("🔍 [DEBUG] Template exists:", fs.existsSync(templatePath));

    const context = {
        name: userName,
        logoutTime: new Date().toLocaleString('en-US', { timeZone: 'Asia/Karachi' }),
        reason,
        link: `${APP_BASE_URL}/sign_in`,
        year: new Date().getFullYear(),
    };

    console.log("🔍 [DEBUG] Template context:", JSON.stringify(context, null, 2));

    try {
        const result = await sendEmail('logout_email', userEmail, 'Logout Notification - Dibnow', context);
        console.log("✅ [DEBUG] Logout email sent successfully");
        console.log("   - Message ID:", result.messageId);
        console.log("   - Response:", result.response);
        return result;
    } catch (error) {
        console.error("❌ [DEBUG] Logout email sending failed:", error.message);
        console.error("❌ [DEBUG] Error code:", error.code);
        console.error("❌ [DEBUG] Error response:", error.response);
        throw error;
    }
}

module.exports = { sendConfirmationEmail, sendForgotPasswordEmail, sendLogoutEmail };