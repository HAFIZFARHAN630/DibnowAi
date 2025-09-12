const db = require("../config/db");
const sql = require("../models/help");

exports.plan = (req, res) => {
  const userId = req.session.userId;

  const sqlProfile =
    "SELECT first_name, last_name, phone_number, email, company, address, user_img,plan_name, status,denial_reason,role FROM users WHERE id = ?";
  db.query(sqlProfile, [userId], (err, profileResult) => {
    if (err) {
      console.error("Database query error (profile):", err);
      return res.status(500).send("Internal Server Error");
    }
    if (profileResult.length === 0) {
      return res.redirect("/sign_in");
    }
    const user = profileResult[0];
    // Fetch categories, brands, and products concurrently
    const sqlCategories = "SELECT * FROM categories WHERE user_id = ?";
    const sqlBrands = "SELECT * FROM brand WHERE user_id = ?";
    const sqlItems =
      "SELECT * FROM inventery WHERE user_id = ? ORDER BY id DESC";
    db.query(sqlCategories, [userId], (err, categories) => {
      if (err) {
        console.error("Database query error (categories):", err);
        return res.status(500).send("Internal Server Error");
      }
      db.query(sqlBrands, [userId], (err, brand) => {
        if (err) {
          console.error("Database query error (brand):", err);
          return res.status(500).send("Internal Server Error");
        }
        db.query(sqlItems, [userId], (err, itemsResult) => {
          // Pass userId here
          if (err) {
            console.error("Database query error (inventory):", err);
            return res.status(500).send("Internal Server Error");
          }
          // Render the 'in_stock' page with all the fetched data
          res.render("Help/Help", {
            profileImagePath: user.user_img || "/uploads/default.png",
            firstName: user.first_name,
            lastName: user.last_name,
            company: user.company,
            categories: categories,
            brand: brand,
            products: itemsResult,
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
    });
  });
};
