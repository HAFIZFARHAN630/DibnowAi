const connection = require("../config/db");

const sql = `CREATE TABLE IF NOT EXISTS sold_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  fullName VARCHAR(120),
  Number int(120),
  Price int(120),   
  Product VARCHAR(120),
  Type VARCHAR(120),
  sale_date datetime DEFAULT CURRENT_TIMESTAMP,
  created_at datetime DEFAULT CURRENT_TIMESTAMP,
  user_id INT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
)`;

connection.query(sql, function (err, result) {
  if (err) throw err;
  console.log("Sold Items table created");
});

module.exports = sql;
