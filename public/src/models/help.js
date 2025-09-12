const connection = require("../config/db");

const sql = `CREATE TABLE IF NOT EXISTS messages(
id INT AUTO_INCREMENT PRIMARY KEY,
user_id INT NOT NULL,
type VARCHAR(50),
massage VARCHAR(255),
timestamp datetime DEFAULT CURRENT_TIMESTAMP,
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE)`;

connection.query(sql, function (err, result) {
  if (err) throw err;
  console.log("Help table created ");
});

module.exports = sql;
