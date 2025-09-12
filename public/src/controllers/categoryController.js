const db = require("../config/db");
const sql = require("../models/categories");

exports.getcategory = (req, res) => {
  const userId = req.session.userId;
  if (!userId) {
    return res.redirect("/sign_in");
  }
  // Fetch user profile data
  const sqlProfile =
    "SELECT first_name, last_name, phone_number, email, company, address, user_img,plan_name, status,denial_reason,role FROM users WHERE id = ?";
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
    const sql = "SELECT * FROM categories WHERE user_id = ?";
    db.query(sql, [userId], (err, results) => {
      if (err) {
        console.error("Error fetching categories:", err);
        return res.status(500).send("Server Error");
      }
      // Pass profile data and categories to the view
      res.render("Category/category", {
        profileImagePath: user.user_img || "/uploads/default.png",
        firstName: user.first_name,
        lastName: user.last_name,
        categories: results,
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

//

exports.addcategory = (req, res) => {
  const { name, description } = req.body;
  const sqlInsert =
    "INSERT INTO categories (name, description, user_id) VALUES (?, ?, ?)";
  db.query(sqlInsert, [name, description, req.session.userId], (err) => {
    if (err) {
      console.error("Error inserting data:", err);
      return res.status(500).send("Server Error");
    }
    exports.getcategory(req, res);
    req.flash("success_msg", "Category added successfully");
    res.redirect("/category");
  });
};

exports.deletecategory = (req, res) => {
  const categoryId = req.params.id;
  const sql = "DELETE FROM categories WHERE id = ?";

  db.query(sql, [categoryId], (err, result) => {
    if (err) {
      console.error("Error deleting category:", err);
      return res.status(500).send("Server Error");
    }
    req.flash("success_msg", "Category deleted successfully");
    res.redirect("/category");
  });
};

exports.update = (req, res) => {
  const categoryId = req.params.id;
  const { name, description } = req.body;
  const sql = "UPDATE categories SET name = ?, description = ? WHERE id = ?";

  db.query(sql, [name, description, categoryId], (err, result) => {
    if (err) {
      console.error("Error updating category:", err);
      return res.status(500).send("Server Error");
    }
    req.flash("success_msg", "Category updated successfully");
    res.redirect("/category");
  });
};
