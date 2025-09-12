const connection = require("../config/db");

const sql = `CREATE TABLE IF NOT EXISTS categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255),
  description VARCHAR(255),
  user_id INT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
)`;

connection.query(sql, function (err, result) {
  if (err) throw err;
  console.log("Categories table created");
});

module.exports = sql;
