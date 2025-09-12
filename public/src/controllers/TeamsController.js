const db = require("../config/db");

// Fetch Team profile data
exports.SelectTeam = (req, res) => {
  const userId = req.session.userId;

  if (!userId) {
    console.error("User is not logged in.");
    return res.redirect("/sign_in");
  }

  const sqlProfile =
    "SELECT first_name, last_name, phone_number, email, company, address, user_img,plan_name,  status,denial_reason, role FROM users WHERE id = ?";
  db.query(sqlProfile, [userId], (err, profileResult) => {
    if (err) {
      console.error("Database query error (profile):", err);
      return res.status(500).send("Internal Server Error");
    }

    if (profileResult.length === 0) {
      return res.redirect("/sign_in");
    }

    const user = profileResult[0];

    const sql = "SELECT * FROM addusers WHERE user_id = ?";

    db.query(sql, [userId], (err, results) => {
      if (err) {
        console.error("Error fetching users:", err);
        res.status(500).send("Database error");
      } else {
        res.render("Teams/Teams", {
          users: results,
          profileImagePath: user.user_img || "/uploads/default.png",
          firstName: user.first_name,
          lastName: user.last_name,
          isUser: user.role === "user",
          plan_name: user.plan_name || "No Plan",
          status: user.status,
          //
          reson: user.denial_reason,
        });
      }
    });
  });
};

// Add a new user
exports.addteams = (req, res) => {
  const { name, email, address, phone } = req.body;
  const userId = req.session.userId;

  // Proceed to add a new user if stock limit is not exceeded
  const sqlInsert = `
            INSERT INTO addusers (name, email, address, phone, user_id) 
            VALUES (?, ?, ?, ?, ?)
          `;
  db.query(sqlInsert, [name, email, address, phone, userId], (err, result) => {
    if (err) {
      console.error("Database query error (add user):", err);
      return res.status(500).send("Failed to add user.");
    }

    req.flash("success_msg", "User added successfully!");
    res.redirect("/Teams");
  });
};

// Update Team Controller
exports.updateteam = (req, res) => {
  const { id, name, email, address, phone } = req.body; // Get id from req.body
  const sql =
    "UPDATE addusers SET name=?, email=?, address=?, phone=? WHERE id=?";
  db.query(sql, [name, email, address, phone, id], (err, result) => {
    if (err) {
      return res.status(500).send(err);
    }
    res.redirect("/Teams");
  });
};

// Delete Team
exports.deleteteam = (req, res) => {
  const userId = req.params.id;

  const sql = "DELETE FROM addusers WHERE id = ?";
  db.query(sql, [userId], (err, result) => {
    if (err) {
      return res.status(500).send(err);
    }
    res.redirect("/Teams"); // Redirect back to the users page
  });
};
