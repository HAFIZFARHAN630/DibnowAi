const connection = require("../config/db");

const sql = `CREATE TABLE IF NOT EXISTS brand (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  name VARCHAR(255),
  description VARCHAR(255),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
)`;

connection.query(sql, function (err, result) {
  if (err) throw err;
  console.log("Brand table created");
});

module.exports = sql;
