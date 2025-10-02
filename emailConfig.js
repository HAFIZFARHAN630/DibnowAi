const nodemailer = require("nodemailer");
const hbs = require("nodemailer-express-handlebars");
const path = require("path");
require("dotenv").config();

// Handlebars template engine setup
const handlebarOptions = {
  viewEngine: {
    extname: ".hbs",
    layoutsDir: path.resolve("./email-temp"),
    defaultLayout: false,
    partialsDir: path.resolve("./email-temp/partials"),
  },
  viewPath: path.resolve("./email-temp"),
  extName: ".hbs",
};

// Enhanced transporter configuration with better error handling
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || "smtp-relay.brevo.com",
  port: Number(process.env.EMAIL_PORT) || 587,
  secure: process.env.EMAIL_SECURE === "true" || false, // false for port 587
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  // Add connection timeout and retry options
  connectionTimeout: 60000, // 60 seconds
  greetingTimeout: 30000, // 30 seconds
  socketTimeout: 60000, // 60 seconds
  // Enable debug logging
  debug: true,
  logger: true,
  // Add TLS options for better security
  tls: {
    rejectUnauthorized: false, // Allow self-signed certificates if needed
    ciphers: 'SSLv3'
  }
});

// Initialize Handlebars engine properly (optional for basic email functionality)
try {
  // Check if hbs is properly imported
  if (typeof hbs === 'function') {
    const hbsPlugin = hbs(handlebarOptions);
    transporter.use('compile', hbsPlugin);
    console.log("✅ [DEBUG] Handlebars engine initialized successfully");
  } else if (typeof hbs === 'object' && hbs.default) {
    // Try default export
    const hbsPlugin = hbs.default(handlebarOptions);
    transporter.use('compile', hbsPlugin);
    console.log("✅ [DEBUG] Handlebars engine initialized successfully (using default export)");
  } else {
    console.warn("⚠️ [DEBUG] Handlebars not properly imported, template emails may not work");
    console.warn("⚠️ [DEBUG] Basic email sending will still function");
  }
} catch (error) {
  console.error("❌ [DEBUG] Failed to initialize Handlebars:", error.message);
  console.warn("⚠️ [DEBUG] Template emails may not work, but basic emails will still function");
}

// Comprehensive SMTP connection test function
async function testSMTPConnection() {
  console.log("🔧 [SMTP TEST] Starting comprehensive SMTP connection test...");
  console.log("🔧 [SMTP TEST] Configuration:");
  console.log("   - Host:", process.env.EMAIL_HOST || "smtp-relay.brevo.com");
  console.log("   - Port:", Number(process.env.EMAIL_PORT) || 587);
  console.log("   - Secure:", process.env.EMAIL_SECURE === "true" || false);
  console.log("   - User:", process.env.EMAIL_USER);
  console.log("   - Password/API Key:", process.env.EMAIL_PASS ? "****" + process.env.EMAIL_PASS.slice(-4) : "Not set");

  return new Promise((resolve, reject) => {
    transporter.verify((error, success) => {
      if (error) {
        console.error("❌ [SMTP TEST] Connection failed:", error.message);
        console.error("❌ [SMTP TEST] Error code:", error.code);
        console.error("❌ [SMTP TEST] Error response:", error.response);
        console.error("❌ [SMTP TEST] Full error:", error);
        reject(error);
      } else {
        console.log("✅ [SMTP TEST] Server is ready to take messages");
        console.log("✅ [SMTP TEST] Connection successful:", success);
        resolve(success);
      }
    });
  });
}

// Test email sending function
async function testEmailSending() {
  console.log("🔧 [EMAIL TEST] Testing email sending capability...");

  const testMailOptions = {
    from: `"${process.env.EMAIL_NAME}" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
    to: "test@example.com", // Use a test email that you can check
    subject: "SMTP Test Email - Dibnow",
    html: `
      <h2>SMTP Connection Test</h2>
      <p>This is a test email to verify SMTP configuration.</p>
      <p>Sent at: ${new Date().toISOString()}</p>
      <p>Host: ${process.env.EMAIL_HOST}</p>
      <p>Port: ${process.env.EMAIL_PORT}</p>
    `,
    headers: {
      'X-Priority': '1',
      'X-MSMail-Priority': 'High',
      'Importance': 'high'
    }
  };

  try {
    const result = await transporter.sendMail(testMailOptions);
    console.log("✅ [EMAIL TEST] Test email sent successfully");
    console.log("   - Message ID:", result.messageId);
    console.log("   - Response:", result.response);
    console.log("   - Envelope:", result.envelope);
    return result;
  } catch (error) {
    console.error("❌ [EMAIL TEST] Test email failed:", error.message);
    console.error("❌ [EMAIL TEST] Error code:", error.code);
    console.error("❌ [EMAIL TEST] Error response:", error.response);
    throw error;
  }
}

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

// Export both transporter and test functions
module.exports = {
  transporter,
  testSMTPConnection,
  testEmailSending
};