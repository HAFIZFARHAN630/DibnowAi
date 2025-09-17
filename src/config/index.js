const nodemailer = require("nodemailer");
const hbsModule = require("nodemailer-express-handlebars");
const hbs = hbsModule.default;
const path = require("path");
require("dotenv").config();

async function sendEmail(to, subject, template, context) {
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: Number(process.env.EMAIL_PORT) || 465,
    secure: process.env.EMAIL_SECURE === "true" || true,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    logger: true,
    debug: true,
  });

  // 👉 Point to email_templates folder OUTSIDE src
  const templatesPath = path.resolve(__dirname, "../..", "email-temp");

  transporter.use(
    "compile",
    hbs({
      viewEngine: {
        extname: ".hbs",
        layoutsDir: templatesPath,
        defaultLayout: false,
        partialsDir: path.join(templatesPath, "partials"),
      },
      viewPath: templatesPath,
      extName: ".hbs",
    })
  );

  const mailOptions = {
    from: `"${process.env.EMAIL_NAME || 'ClickTake Technologies'}" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    template, // e.g., "Email_Confirmation"
    context,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(` Email sent to ${to}:`, info.messageId);
    return info;
  } catch (err) {
    console.error(` Error sending email to ${to}:`, err.message);
    throw err;
  }
}

module.exports = sendEmail;
