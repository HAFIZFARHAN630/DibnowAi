const connection = require("../config/db");

const sql = `CREATE TABLE IF NOT EXISTS inventery (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  product_name VARCHAR(255),
  Quantity INT(255),
  Brand VARCHAR(255),
  Model VARCHAR(255),
  Color VARCHAR(255),
  Sale_Price INT(255),
  imei_number INT(255),
  gadget_problem VARCHAR(255),
  device_image VARCHAR(255),
  Category VARCHAR(255),
  Retail_Price INT(255),
  status VARCHAR(150),
  sale_date datetime DEFAULT CURRENT_TIMESTAMP,
  created_at datetime DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
)`;

connection.query(sql, function (err, result) {
  if (err) throw err;
  console.log("Inventory table created");
});

module.exports = sql;
