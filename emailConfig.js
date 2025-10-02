const nodemailer = require("nodemailer");
const hbs = require("nodemailer-express-handlebars");
const path = require("path");
require("dotenv").config();

// Handlebars template engine setup
const handlebarOptions = {
  viewEngine: {
    extName: ".hbs",
    partialsDir: path.resolve("./email-temp"),
    defaultLayout: false,
  },
  viewPath: path.resolve("./email-temp"),
  extName: ".hbs",
};

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || "smtp-relay.brevo.com",
  port: Number(process.env.EMAIL_PORT) || 587,
  secure: process.env.EMAIL_SECURE === "true" || false,
  auth: {
    user: process.env.EMAIL_USER || "985caa001@smtp-brevo.com",
    pass: process.env.EMAIL_PASS || "FX16QqdJDnGEWZO4",
  },
});

// Initialize Handlebars engine properly
try {
  // For nodemailer-express-handlebars, we need to use it differently
  const handlebars = hbs(handlebarOptions);
  transporter.use("compile", handlebars);
  console.log("✅ [DEBUG] Handlebars engine initialized successfully");
} catch (error) {
  console.error("❌ [DEBUG] Failed to initialize Handlebars:", error.message);
  console.error("❌ [DEBUG] This might be due to incorrect nodemailer-express-handlebars usage");
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

module.exports = transporter;