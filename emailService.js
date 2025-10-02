const transporter = require("./emailConfig");
require("dotenv").config();

const APP_BASE_URL = process.env.APP_BASE_URL || "http://localhost:3000";

// 📩 Confirmation Email
async function sendConfirmationEmail(email, otp) {
  const confirmationLink = `${APP_BASE_URL}/verify-email?email=${email}&otp=${otp}`;
  const loginUrl = `${APP_BASE_URL}/sign_in`;

  return transporter.sendMail({
    from: `"${process.env.EMAIL_NAME}" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "Confirm Your Email - Dibnow",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Email Confirmation</h2>
        <p>Thank you for registering with Dibnow!</p>
        <p>Your OTP for email verification is: <strong style="font-size: 18px; color: #007bff;">${otp}</strong></p>
        <p>Click the link below to verify your email:</p>
        <p><a href="${confirmationLink}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Verify Email</a></p>
        <p>Or use this link: <a href="${confirmationLink}">${confirmationLink}</a></p>
        <p>If you didn't register for an account, please ignore this email.</p>
        <hr style="margin: 30px 0;">
        <p style="color: #666; font-size: 12px;">This email was sent from Dibnow. © ${new Date().getFullYear()}</p>
      </div>
    `,
    text: `Email Confirmation - Dibnow

Thank you for registering with Dibnow!

Your OTP for email verification is: ${otp}

Click this link to verify your email: ${confirmationLink}

Or copy and paste this link in your browser: ${confirmationLink}

If you didn't register for an account, please ignore this email.

This email was sent from Dibnow. © ${new Date().getFullYear()}`
  });
}

// 📩 Forgot Password Email
async function sendForgotPasswordEmail(email, otp) {
  const resetUrl = `${APP_BASE_URL}/reset-password?email=${email}&otp=${otp}`;

  return transporter.sendMail({
    from: `"${process.env.EMAIL_NAME}" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "Password Reset Request - Dibnow",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Password Reset Request</h2>
        <p>You have requested to reset your password for your Dibnow account.</p>
        <p>Your OTP for password reset is: <strong style="font-size: 18px; color: #007bff;">${otp}</strong></p>
        <p>Click the link below to reset your password:</p>
        <p><a href="${resetUrl}" style="background-color: #dc3545; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Reset Password</a></p>
        <p>Or use this link: <a href="${resetUrl}">${resetUrl}</a></p>
        <p><strong>Note:</strong> This OTP will expire in 10 minutes for security reasons.</p>
        <p>If you didn't request a password reset, please ignore this email. Your password will remain unchanged.</p>
        <hr style="margin: 30px 0;">
        <p style="color: #666; font-size: 12px;">This email was sent from Dibnow. © ${new Date().getFullYear()}</p>
      </div>
    `,
    text: `Password Reset Request - Dibnow

You have requested to reset your password for your Dibnow account.

Your OTP for password reset is: ${otp}

Click this link to reset your password: ${resetUrl}

Or copy and paste this link in your browser: ${resetUrl}

Note: This OTP will expire in 10 minutes for security reasons.

If you didn't request a password reset, please ignore this email. Your password will remain unchanged.

This email was sent from Dibnow. © ${new Date().getFullYear()}`
  });
}

// 📩 Logout Email
async function sendLogoutEmail(email, reason = "Manual logout") {
  const loginUrl = `${APP_BASE_URL}/sign_in`;
  const logoutTime = new Date().toLocaleString("en-US", { timeZone: "Asia/Karachi" });

  return transporter.sendMail({
    from: `"${process.env.EMAIL_NAME}" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "Logout Notification - Dibnow",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Logout Notification</h2>
        <p>You have been successfully logged out of your Dibnow account.</p>
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Logout Details:</strong></p>
          <p><strong>Time:</strong> ${logoutTime}</p>
          <p><strong>Reason:</strong> ${reason}</p>
        </div>
        <p>If this was not you, please contact our support team immediately as your account security may be compromised.</p>
        <p>You can log back in anytime using this link:</p>
        <p><a href="${loginUrl}" style="background-color: #28a745; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Login to Dibnow</a></p>
        <hr style="margin: 30px 0;">
        <p style="color: #666; font-size: 12px;">This is an automated security notification from Dibnow. © ${new Date().getFullYear()}</p>
      </div>
    `,
    text: `Logout Notification - Dibnow

You have been successfully logged out of your Dibnow account.

Logout Details:
- Time: ${logoutTime}
- Reason: ${reason}

If this was not you, please contact our support team immediately as your account security may be compromised.

You can log back in anytime using this link: ${loginUrl}

This is an automated security notification from Dibnow. © ${new Date().getFullYear()}`
  });
}

module.exports = {
  sendConfirmationEmail,
  sendForgotPasswordEmail,
  sendLogoutEmail,
};