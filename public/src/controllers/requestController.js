const db = require("../config/db");

//
exports.allusers = (req, res) => {
  const userId = req.session.userId;

  // Make sure userId is available and valid
  if (!userId) {
    return res.redirect("/sign_in");
  }

  // Modify the SQL to fetch all users (without the WHERE   ause filtering by userId)
  const sql = `SELECT id, first_name, last_name, phone_number, email, company, address, user_img, country, currency, role, transfer_id, amount FROM users`;

  // Query all users
  db.query(sql, (err, usersResult) => {
    if (err) {
      console.error("Database query error:", err);
      return res.status(500).send("Internal Server Error");
    }

    const loggedInUser = usersResult.find((user) => user.id === userId); // Find the logged-in user

    if (!loggedInUser) {
      return res.redirect("/sign_in");
    }

    const profileImagePath = loggedInUser.user_img
      ? loggedInUser.user_img
      : "/uploads/default.png";

    // Filter out the logged-in user from the list of users
    const users = usersResult.filter((user) => user.id !== userId);

    // Pass the data to the view
    res.render("Request/request", {
      message: "",
      profileImagePath,
      firstName: loggedInUser.first_name,
      isUser: users.role === "user",
      users: users,
    });
  });
};

// update the denial reason
exports.deny = async (req, res) => {
  const { userId, reason } = req.body;

  // Validate input
  if (!userId || !reason) {
    return res
      .status(400)
      .json({ success: false, message: "User ID and reason are required." });
  }
  try {
    const [result] = await db
      .promise()
      .query("UPDATE users SET denial_reason = ? WHERE id = ?", [
        reason,
        userId,
      ]);

    if (result.affectedRows === 0) {
      req.flash("status_msg", "User not found or already denied.");
    } else {
      req.flash("status_msg", "denied");
    }

    res.redirect("/request");
  } catch (error) {
    req.flash("status_msg", "An error occurred.");
    res.redirect("/request");
  }
};
