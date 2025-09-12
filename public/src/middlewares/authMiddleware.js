const jwt = require("jsonwebtoken");
const db = require("../config/db");

// Check if the user is authenticated (JWT token is valid)
function isAuthenticated(req, res, next) {
  const token = req.cookies.auth_token;

  if (!token) {
    return res.redirect("/sign_in");
  }

  // Verify JWT token
  jwt.verify(token, "your_jwt_secret", (err, decoded) => {
    if (err) {
      return res.redirect("/sign_in");
    }
    req.userId = decoded.id;
    next();
  });
}

// Check if the user is an admin
function isAdmin(req, res, next) {
  const userId = req.userId;

  const sql = "SELECT role FROM users WHERE id = ?";
  db.query(sql, [userId], (err, result) => {
    if (err || result.length === 0 || result[0].role !== "admin") {
      return res.redirect("/index");
    }
    next();
  });
}

module.exports = { isAuthenticated, isAdmin };
