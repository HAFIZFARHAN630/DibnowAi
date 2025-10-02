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

const transporter = nodemailer.createTransport(handlebarOptions, {
  host: process.env.EMAIL_HOST || "smtp-relay.brevo.com",
  port: Number(process.env.EMAIL_PORT) || 587,
  secure: process.env.EMAIL_SECURE === "true" || false,
  auth: {
    user: process.env.EMAIL_USER || "985caa001@smtp-brevo.com",
    pass: process.env.EMAIL_PASS || "FX16QqdJDnGEWZO4",
  },
});

module.exports = transporter;