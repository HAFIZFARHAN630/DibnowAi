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
  // Fix for ES6 module - use default export
  const hbsFunction = hbs.default || hbs;
  console.log("🔍 [DEBUG] hbs function type:", typeof hbsFunction);
  console.log("🔍 [DEBUG] hbs function:", hbsFunction);

  const hbsInstance = hbsFunction(handlebarOptions);
  console.log("🔍 [DEBUG] hbs instance type:", typeof hbsInstance);
  console.log("🔍 [DEBUG] hbs instance:", hbsInstance);

  if (typeof hbsInstance === 'function') {
    transporter.use("compile", hbsInstance);
    console.log("✅ [DEBUG] Handlebars engine initialized successfully");
    console.log("🔍 [DEBUG] ViewPath:", handlebarOptions.viewPath);
    console.log("🔍 [DEBUG] Extension:", handlebarOptions.extName);
  } else {
    console.error("❌ [DEBUG] hbs instance is not a function:", typeof hbsInstance);
  }
} catch (error) {
  console.error("❌ [DEBUG] Failed to initialize Handlebars:", error.message);
  console.error("❌ [DEBUG] Error stack:", error.stack);
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