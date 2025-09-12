const connection = require("../config/db");

const sql = `CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  first_name VARCHAR(255),
  last_name VARCHAR(255),
  email VARCHAR(255),
  phone_number INT,
  password VARCHAR(255),
  company VARCHAR(255),
  address VARCHAR(255),
  postcode INT,
  user_img VARCHAR(255),
  country VARCHAR(255),
  currency VARCHAR(255),
  plan_name VARCHAR(255) DEFAULT 'FREE TRIAL',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  otp varchar(6),
  role VARCHAR(50) DEFAULT 'user', -- Default role is 'user'
  otp_expiry datetime DEFAULT CURRENT_TIMESTAMP,
  subscription_date datetime DEFAULT CURRENT_TIMESTAMP,
  plan_limit INT(11) DEFAULT 30,
  transfer_id VARCHAR(100),
  amount int(120),
  status VARCHAR(255),
  denial_reason VARCHAR(255),
)`;

connection.query(sql, function (err, result) {
  if (err) throw err;
  console.log("User table created successfully");
});

module.exports = sql;
