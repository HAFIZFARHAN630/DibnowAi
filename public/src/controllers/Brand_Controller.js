const db = require("../config/db");
const sql = require("../models/brand");

exports.getbrand = (req, res) => {
  const userId = req.session.userId;
  if (!userId) {
    return res.redirect("/sign_in");
  }
  // Fetch user profile data
  const sqlProfile =
    "SELECT first_name, last_name, phone_number, email, company, address, user_img,plan_name , status,denial_reason ,role FROM users WHERE id = ?";
  db.query(sqlProfile, [userId], (err, profileResult) => {
    if (err) {
      console.error("Database query error:", err);
      return res.status(500).send("Internal Server Error");
    }
    if (profileResult.length === 0) {
      return res.send("User not found");
    }
    const user = profileResult[0];
    // Fetch categories
    const sql = "SELECT * FROM brand WHERE user_id = ?";
    db.query(sql, [userId], (err, results) => {
      if (err) {
        console.error("Error fetching categories:", err);
        return res.status(500).send("Server Error");
      }
      res.render("Brand/Brand", {
        profileImagePath: user.user_img || "/uploads/default.png",
        firstName: user.first_name,
        lastName: user.last_name,
        brand: results,
        isUser: user.role === "user",
        plan_name: user.plan_name || "No Plan",
        success_msg: req.flash("success_msg"),
        error_msg: req.flash("error_msg"),
        status: user.status,
        //
        reson: user.denial_reason,
      });
    });
  });
};

exports.addbrand = (req, res) => {
  const { name, description } = req.body;
  const sqlInsert =
    "INSERT INTO brand (name, description,user_id) VALUES (?, ?, ?)";
  db.query(sqlInsert, [name, description, req.session.userId], (err) => {
    if (err) {
      console.error("Error inserting data:", err);
      return res.status(500).send("Server Error");
    }
    exports.getbrand(req, res);
    req.flash("success_msg", "Brand added successfully");
    res.redirect("/Brand");
  });
};

exports.deletebrand = (req, res) => {
  const brandId = req.params.id;
  const sql = "DELETE FROM brand WHERE id = ?";

  db.query(sql, [brandId], (err, result) => {
    if (err) {
      console.error("Error deleting category:", err);
      return res.status(500).send("Server Error");
    }
    req.flash("success_msg", "Brand deleted successfully");
    res.redirect("/Brand");
  });
};

exports.update = (req, res) => {
  const brandId = req.params.id;
  const { name, description } = req.body;
  const sql = "UPDATE brand SET name = ?, description = ? WHERE id = ?";

  db.query(sql, [name, description, brandId], (err, result) => {
    if (err) {
      console.error("Error updating brand:", err);
      return res.status(500).send("Server Error");
    }
    req.flash("success_msg", "Brand updated successfully");
    res.redirect("/Brand");
  });
};
