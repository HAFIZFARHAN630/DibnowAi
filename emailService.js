const { transporter, testSMTPConnection, testEmailSending } = require("./emailConfig");
const path = require("path");
require("dotenv").config();

const APP_BASE_URL = process.env.APP_BASE_URL || "http://localhost:3000";

// Debug: Check if template files exist
const fs = require("fs");
const templateDir = path.resolve("./email-temp");
console.log("🔍 [DEBUG] Template directory:", templateDir);
console.log("🔍 [DEBUG] Template directory exists:", fs.existsSync(templateDir));

if (fs.existsSync(templateDir)) {
  const files = fs.readdirSync(templateDir);
  console.log("🔍 [DEBUG] Template files found:", files);

  // Check each template file
  const templates = ["Email_Confirmation.hbs", "forgot_password.hbs", "logout_email.hbs"];
  templates.forEach(template => {
    const templatePath = path.join(templateDir, template);
    console.log(`🔍 [DEBUG] ${template} exists:`, fs.existsSync(templatePath));
  });
}

// 📩 Confirmation Email
async function sendConfirmationEmail(userEmail, userName, otp) {
  console.log("🔍 [DEBUG] sendConfirmationEmail called with:");
  console.log("   - Email:", userEmail);
  console.log("   - Name:", userName);
  console.log("   - OTP:", otp);
  console.log("   - APP_BASE_URL:", APP_BASE_URL);

  try {
    const mailOptions = {
      from: `"${process.env.EMAIL_NAME}" <${process.env.EMAIL_USER}>`,
      to: userEmail,
      subject: "Confirm Your Email - Dibnow",
      template: "Email_Confirmation",
      context: {
        name: userName,
        otp,
        confirmationLink: `${APP_BASE_URL}/verify-email?email=${userEmail}&otp=${otp}`,
        loginUrl: `${APP_BASE_URL}/sign_in`,
        year: new Date().getFullYear(),
      },
    };

    console.log("🔍 [DEBUG] Mail options:", JSON.stringify(mailOptions, null, 2));
    console.log("🔍 [DEBUG] Template path:", path.resolve("./email-temp"));
    console.log("🔍 [DEBUG] Template files exist check:");

    const fs = require("fs");
    const templatePath = path.resolve("./email-temp/Email_Confirmation.hbs");
    console.log("   - Template file exists:", fs.existsSync(templatePath));
    console.log("   - Template path:", templatePath);

    console.log("🔍 [DEBUG] About to send email with options:", JSON.stringify(mailOptions, null, 2));

    const result = await transporter.sendMail(mailOptions);
    console.log("✅ [DEBUG] Email sent successfully:", result.messageId);
    console.log("🔍 [DEBUG] Email result details:", {
      messageId: result.messageId,
      response: result.response,
      envelope: result.envelope,
      accepted: result.accepted,
      rejected: result.rejected,
      pending: result.pending
    });

    // Check if email was actually accepted
    if (result.accepted && result.accepted.length > 0) {
      console.log("✅ [DEBUG] Email accepted by server for delivery");
    } else if (result.rejected && result.rejected.length > 0) {
      console.error("❌ [DEBUG] Email rejected by server:", result.rejected);
    } else if (result.pending && result.pending.length > 0) {
      console.log("⏳ [DEBUG] Email pending delivery:", result.pending);
    }

    return result;

  } catch (error) {
    console.error("❌ [DEBUG] Email sending failed:", error.message);
    console.error("❌ [DEBUG] Error code:", error.code);
    console.error("❌ [DEBUG] Error response:", error.response);
    console.error("❌ [DEBUG] Error stack:", error.stack);

    // Provide specific guidance based on error type
    if (error.code === 'EAUTH') {
      console.error("❌ [DEBUG] Authentication failed - check your Brevo API key");
    } else if (error.code === 'ECONNECTION') {
      console.error("❌ [DEBUG] Connection failed - check network and SMTP settings");
    } else if (error.code === 'ETIMEDOUT') {
      console.error("❌ [DEBUG] Timeout - server took too long to respond");
    } else if (error.response && error.response.includes('550')) {
      console.error("❌ [DEBUG] Email rejected - possible spam or invalid recipient");
    }

    throw error;
  }
}

// 📩 Forgot Password Email
async function sendForgotPasswordEmail(userEmail, userName, otp) {
  console.log("🔍 [DEBUG] sendForgotPasswordEmail called with:");
  console.log("   - Email:", userEmail);
  console.log("   - Name:", userName);
  console.log("   - OTP:", otp);

  try {
    const mailOptions = {
      from: `"${process.env.EMAIL_NAME}" <${process.env.EMAIL_USER}>`,
      to: userEmail,
      subject: "Password Reset Request - Dibnow",
      template: "forgot_password",
      context: {
        name: userName,
        otp,
        resetUrl: `${APP_BASE_URL}/reset-password?email=${userEmail}&otp=${otp}`,
        year: new Date().getFullYear(),
      },
    };

    console.log("🔍 [DEBUG] Forgot password mail options:", JSON.stringify(mailOptions, null, 2));

    const result = await transporter.sendMail(mailOptions);
    console.log("✅ [DEBUG] Forgot password email sent successfully:", result.messageId);
    console.log("🔍 [DEBUG] Email result details:", {
      messageId: result.messageId,
      response: result.response,
      envelope: result.envelope,
      accepted: result.accepted,
      rejected: result.rejected,
      pending: result.pending
    });

    // Check if email was actually accepted
    if (result.accepted && result.accepted.length > 0) {
      console.log("✅ [DEBUG] Forgot password email accepted by server for delivery");
    } else if (result.rejected && result.rejected.length > 0) {
      console.error("❌ [DEBUG] Forgot password email rejected by server:", result.rejected);
    } else if (result.pending && result.pending.length > 0) {
      console.log("⏳ [DEBUG] Forgot password email pending delivery:", result.pending);
    }

    return result;

  } catch (error) {
    console.error("❌ [DEBUG] Forgot password email sending failed:", error.message);
    console.error("❌ [DEBUG] Error code:", error.code);
    console.error("❌ [DEBUG] Error response:", error.response);
    console.error("❌ [DEBUG] Error stack:", error.stack);

    // Provide specific guidance based on error type
    if (error.code === 'EAUTH') {
      console.error("❌ [DEBUG] Authentication failed - check your Brevo API key");
    } else if (error.code === 'ECONNECTION') {
      console.error("❌ [DEBUG] Connection failed - check network and SMTP settings");
    } else if (error.code === 'ETIMEDOUT') {
      console.error("❌ [DEBUG] Timeout - server took too long to respond");
    } else if (error.response && error.response.includes('550')) {
      console.error("❌ [DEBUG] Email rejected - possible spam or invalid recipient");
    }

    throw error;
  }
}

// 📩 Logout Email
async function sendLogoutEmail(userEmail, userName, reason = "Manual logout") {
  console.log("🔍 [DEBUG] sendLogoutEmail called with:");
  console.log("   - Email:", userEmail);
  console.log("   - Name:", userName);
  console.log("   - Reason:", reason);

  try {
    const mailOptions = {
      from: `"${process.env.EMAIL_NAME}" <${process.env.EMAIL_USER}>`,
      to: userEmail,
      subject: "Logout Notification - Dibnow",
      template: "logout_email",
      context: {
        name: userName,
        logoutTime: new Date().toLocaleString("en-US", { timeZone: "Asia/Karachi" }),
        link: `${APP_BASE_URL}/sign_in`,
        reason,
        year: new Date().getFullYear(),
      },
    };

    console.log("🔍 [DEBUG] Logout mail options:", JSON.stringify(mailOptions, null, 2));

    const result = await transporter.sendMail(mailOptions);
    console.log("✅ [DEBUG] Logout email sent successfully:", result.messageId);
    console.log("🔍 [DEBUG] Email result details:", {
      messageId: result.messageId,
      response: result.response,
      envelope: result.envelope,
      accepted: result.accepted,
      rejected: result.rejected,
      pending: result.pending
    });

    // Check if email was actually accepted
    if (result.accepted && result.accepted.length > 0) {
      console.log("✅ [DEBUG] Logout email accepted by server for delivery");
    } else if (result.rejected && result.rejected.length > 0) {
      console.error("❌ [DEBUG] Logout email rejected by server:", result.rejected);
    } else if (result.pending && result.pending.length > 0) {
      console.log("⏳ [DEBUG] Logout email pending delivery:", result.pending);
    }

    return result;

  } catch (error) {
    console.error("❌ [DEBUG] Logout email sending failed:", error.message);
    console.error("❌ [DEBUG] Error code:", error.code);
    console.error("❌ [DEBUG] Error response:", error.response);
    console.error("❌ [DEBUG] Error stack:", error.stack);

    // Provide specific guidance based on error type
    if (error.code === 'EAUTH') {
      console.error("❌ [DEBUG] Authentication failed - check your Brevo API key");
    } else if (error.code === 'ECONNECTION') {
      console.error("❌ [DEBUG] Connection failed - check network and SMTP settings");
    } else if (error.code === 'ETIMEDOUT') {
      console.error("❌ [DEBUG] Timeout - server took too long to respond");
    } else if (error.response && error.response.includes('550')) {
      console.error("❌ [DEBUG] Email rejected - possible spam or invalid recipient");
    }

    throw error;
  }
}

// Enhanced test function to verify email service with comprehensive debugging
async function testEmailService() {
  console.log("🧪 [TEST] Starting comprehensive email service test...");

  try {
    // Step 1: Test SMTP connection
    console.log("🧪 [TEST] Step 1: Testing SMTP connection...");
    await testSMTPConnection();
    console.log("✅ [TEST] SMTP connection test passed");
  } catch (error) {
    console.error("❌ [TEST] SMTP connection test failed:", error.message);
    console.error("❌ [TEST] This indicates a problem with your Brevo configuration");
    console.error("❌ [TEST] Please check:");
    console.error("   - API key is valid and not expired");
    console.error("   - Account has sending permissions");
    console.error("   - Network connectivity to smtp-relay.brevo.com:587");
    return; // Stop testing if SMTP connection fails
  }

  try {
    // Step 2: Test basic email sending
    console.log("🧪 [TEST] Step 2: Testing basic email sending...");
    await testEmailSending();
    console.log("✅ [TEST] Basic email sending test passed");
  } catch (error) {
    console.error("❌ [TEST] Basic email sending test failed:", error.message);
    console.error("❌ [TEST] This indicates email delivery issues");
    console.error("❌ [TEST] Possible causes:");
    console.error("   - Brevo account restrictions or rate limits");
    console.error("   - Invalid sender domain or authentication");
    console.error("   - Recipient email filtering");
    return; // Stop if basic sending fails
  }

  try {
    // Step 3: Test template-based confirmation email
    console.log("🧪 [TEST] Step 3: Testing template-based confirmation email...");
    await sendConfirmationEmail("test@gmail.com", "Test User", "123456");
    console.log("✅ [TEST] Template confirmation email test passed");
  } catch (error) {
    console.error("❌ [TEST] Template confirmation email test failed:", error.message);
    console.error("❌ [TEST] Error stack:", error.stack);
    console.error("❌ [TEST] This might be a template rendering issue");
  }

  try {
    // Step 4: Test forgot password email
    console.log("🧪 [TEST] Step 4: Testing forgot password email...");
    await sendForgotPasswordEmail("test@gmail.com", "Test User", "654321");
    console.log("✅ [TEST] Forgot password email test passed");
  } catch (error) {
    console.error("❌ [TEST] Forgot password email test failed:", error.message);
    console.error("❌ [TEST] Error stack:", error.stack);
  }

  try {
    // Step 5: Test logout email
    console.log("🧪 [TEST] Step 5: Testing logout email...");
    await sendLogoutEmail("test@gmail.com", "Test User", "Test logout");
    console.log("✅ [TEST] Logout email test passed");
  } catch (error) {
    console.error("❌ [TEST] Logout email test failed:", error.message);
    console.error("❌ [TEST] Error stack:", error.stack);
  }

  console.log("🧪 [TEST] Email service test completed");
}

// Run test if this file is executed directly
if (require.main === module) {
  testEmailService().then(() => {
    console.log("🧪 [TEST] All email tests completed");
    process.exit(0);
  }).catch((error) => {
    console.error("🧪 [TEST] Email tests failed:", error);
    process.exit(1);
  });
}

module.exports = {
  sendConfirmationEmail,
  sendForgotPasswordEmail,
  sendLogoutEmail,
  testEmailService,
};