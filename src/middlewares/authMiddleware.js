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

// Middleware to set user data for views
async function setUserData(req, res, next) {
  try {
    if (req.userId) {
      const user = await User.findById(req.userId).select("first_name email user_img role");

      if (user) {
        // Set variables for views
        res.locals.profileImagePath = user.user_img || '/img/dumi img.png';
        res.locals.firstName = user.first_name || 'User';
        res.locals.email = user.email || 'user@example.com';
        res.locals.isAdmin = user.role === 'admin';
        res.locals.isUser = user.role === 'user';
      } else {
        // Set default values if user not found
        res.locals.profileImagePath = '/img/dumi img.png';
        res.locals.firstName = 'User';
        res.locals.email = 'user@example.com';
        res.locals.isAdmin = false;
        res.locals.isUser = false;
      }
    } else {
      // Set default values if no user
      res.locals.profileImagePath = '/img/dumi img.png';
      res.locals.firstName = 'User';
      res.locals.email = 'user@example.com';
      res.locals.isAdmin = false;
      res.locals.isUser = false;
    }
    next();
  } catch (error) {
    console.error("Error setting user data:", error.message);
    // Set default values on error
    res.locals.profileImagePath = '/img/dumi img.png';
    res.locals.firstName = 'User';
    res.locals.email = 'user@example.com';
    res.locals.isAdmin = false;
    res.locals.isUser = false;
    next();
  }
}

module.exports = { isAuthenticated, isAdmin, setUserData };
