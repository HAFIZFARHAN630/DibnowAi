const transporter = require("./emailConfig");
require("dotenv").config();

const APP_BASE_URL = process.env.APP_BASE_URL || "http://localhost:3000";

// 📩 Confirmation Email
async function sendConfirmationEmail(email, otp) {
  return transporter.sendMail({
    from: `"${process.env.EMAIL_NAME}" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "Confirm Your Email - Dibnow",
    template: "Email_Confirmation",
    context: {
      otp,
      confirmationLink: `${APP_BASE_URL}/verify-email?email=${email}&otp=${otp}`,
      loginUrl: `${APP_BASE_URL}/sign_in`,
      year: new Date().getFullYear(),
    },
  });
}

// 📩 Forgot Password Email
async function sendForgotPasswordEmail(email, otp) {
  return transporter.sendMail({
    from: `"${process.env.EMAIL_NAME}" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "Password Reset Request - Dibnow",
    template: "forgot_password",
    context: {
      otp,
      resetUrl: `${APP_BASE_URL}/reset-password?email=${email}&otp=${otp}`,
      year: new Date().getFullYear(),
    },
  });
}

// 📩 Logout Email
async function sendLogoutEmail(email, reason = "Manual logout") {
  return transporter.sendMail({
    from: `"${process.env.EMAIL_NAME}" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "Logout Notification - Dibnow",
    template: "logout_email",
    context: {
      logoutTime: new Date().toLocaleString("en-US", { timeZone: "Asia/Karachi" }),
      link: `${APP_BASE_URL}/sign_in`,
      reason,
      year: new Date().getFullYear(),
    },
  });
}

module.exports = {
  sendConfirmationEmail,
  sendForgotPasswordEmail,
  sendLogoutEmail,
};