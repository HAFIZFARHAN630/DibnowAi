const jwt = require("jsonwebtoken");
const User = require("../models/user");

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
async function isAdmin(req, res, next) {
  try {
    const userId = req.userId;
    
    const user = await User.findById(userId).select("role");
    if (!user || user.role !== "admin") {
      return res.redirect("/index");
    }
    next();
  } catch (error) {
    console.error("Admin check error:", error.message);
    return res.redirect("/index");
  }
}

module.exports = { isAuthenticated, isAdmin };
