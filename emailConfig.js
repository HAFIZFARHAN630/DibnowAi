const nodemailer = require("nodemailer");
const hbs = require("nodemailer-express-handlebars");
const path = require("path");
require("dotenv").config();

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT),
  secure: process.env.EMAIL_SECURE === "true",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

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

transporter.use("compile", hbs(handlebarOptions));

module.exports = transporter;