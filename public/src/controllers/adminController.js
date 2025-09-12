const db = require("../config/db");
const bcrypt = require("bcrypt");

// Render admin page with the list of users
exports.admin = (req, res) => {
  const userId = req.session.userId;
  const sql = `
    SELECT id, first_name, email, phone_number, role, user_img , plan_name,company,role, plan_limit
    FROM users`;
  db.query(sql, (err, usersResult) => {
    if (err) {
      console.error("Database query error:", err);
      return res.status(500).send("Internal Server Error");
    }
    // Find the logged-in user's data in the result set
    const loggedInUser = usersResult.find((user) => user.id === userId);
    if (!loggedInUser) {
      return res.redirect("/sign_in");
    }
    const profileImagePath = loggedInUser.user_img
      ? loggedInUser.user_img
      : "/uploads/default.png";
    // Filter out the logged-in user from the list of users to display
    const users = usersResult.filter((user) => user.id !== userId);
    res.render("admin/adminfile", {
      profileImagePath,
      firstName: loggedInUser.first_name,
      isUser: users.role === "user",
      users: users,
    });
  });
};

// Update User
exports.updateUser = (req, res) => {
  const userId = req.params.id;
  const { first_name, last_name, email, phone_number, plan_name, plan_limit } =
    req.body;

  // SQL query to update the user
  const sql = `
    UPDATE users 
    SET first_name = ?, last_name = ?, email = ?, phone_number = ?, plan_name = ? , plan_limit = ?
    WHERE id = ?`;

  // Query execution with the updated data
  db.query(
    sql,
    [first_name, last_name, email, phone_number, plan_name, plan_limit, userId],
    (err) => {
      if (err) {
        return res.status(500).send("Failed to update user");
      }

      req.flash("success_msg", "User updated successfully!");

      res.redirect("/admin");
    }
  );
};

// Delete a user by ID
exports.deleteUser = (req, res) => {
  const userId = req.params.id;

  const sql = "DELETE FROM users WHERE id = ?";
  db.query(sql, [userId], (err) => {
    if (err) {
      return res.status(500).send("Failed to delete user");
    }
    res.redirect("/admin");
  });
};

// Render the Add Admin page // Render the Add Admin page // Render the Add Admin page
// Render the Add Admin page // Render the Add Admin page // Render the Add Admin page
exports.selectAddAdmin = (req, res) => {
  const userId = req.session.userId;
  const sql = `
    SELECT id, first_name, last_name, email, phone_number, role, user_img , plan_name , role
    FROM users`;
  db.query(sql, (err, usersResult) => {
    if (err) {
      console.error("Database query error:", err);
      return res.status(500).send("Internal Server Error");
    }
    const loggedInUser = usersResult.find((user) => user.id === userId);
    if (!loggedInUser) {
      return res.redirect("/sign_in");
    }
    const profileImagePath = loggedInUser.user_img
      ? loggedInUser.user_img
      : "/uploads/default.png";
    const users = usersResult.filter((user) => user.id !== userId);
    res.render("admin/addAdmin", {
      message: "",
      profileImagePath,
      firstName: loggedInUser.first_name,
      isUser: users.role === "user",
      users: users,
    });
  });
};

// Add an admin
exports.addAdmin = (req, res) => {
  const {
    first_name,
    last_name,
    email,
    phone_number,
    password,
    role,
    plan_name,
    plan_limit,
  } = req.body;

  // Validate inputs
  if (
    !first_name ||
    !last_name ||
    !email ||
    !phone_number ||
    !password ||
    !role ||
    !plan_limit
  ) {
    return res.status(400).json({ error: "All fields are required." });
  }

  // Hash the password
  bcrypt
    .hash(password, 10)
    .then((hashedPassword) => {
      const sql = `
        INSERT INTO users (first_name, last_name, email, phone_number, password, role ,plan_name ,plan_limit)
        VALUES (?, ?, ?, ?, ?, ?, ?,?)
      `;
      db.query(
        sql,
        [
          first_name,
          last_name,
          email,
          phone_number,
          hashedPassword,
          role,
          plan_name,
          plan_limit,
        ],
        (err) => {
          if (err) {
            console.error("Database error:", err);
            return res.status(500).json({ error: "Error creating account." });
          }
          res.redirect("/addAdmin");
        }
      );
    })
    .catch((err) => {
      console.error("Hashing error:", err);
      res.status(500).json({ error: "Error hashing password." });
    });
};
