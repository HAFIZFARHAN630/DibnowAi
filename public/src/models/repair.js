const connection = require("../config/db");

const sql = `CREATE TABLE IF NOT EXISTS repairs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  fullName VARCHAR(255),
  user_id INT NOT NULL,
  mobileNumber INT(255),
  brand VARCHAR(255),
  email VARCHAR(255),
  device VARCHAR(255),
  deviceImage VARCHAR(255),
  status VARCHAR(255),
  gadgetProblem VARCHAR(255),
  random_id VARCHAR(255),
  Price INT(255),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
)`;

connection.query(sql, function (err, result) {
  if (err) throw err;
  console.log("Repairs table created");
});

module.exports = sql;
