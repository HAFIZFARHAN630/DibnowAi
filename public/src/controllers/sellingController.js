const db = require("../config/db");
const sql = require("../models/Sold_Products");
// Selecting Sell Products

exports.SelectSell = (req, res) => {
  const userId = req.session.userId;
  if (!userId) {
    console.error("User is not logged in.");
    return res.redirect("/sign_in");
  }

  // Fetch user profile data
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

    const sql = "SELECT * FROM sold_items WHERE user_id = ? ORDER BY id DESC";
    db.query(sql, [userId], (err, result) => {
      // Pass userId here
      if (err) {
        console.error("Database Error:", err);
        return res
          .status(500)
          .send("An error occurred while fetching the repair products.");
      }
      res.render("Sell_Products/sell", {
        products: result,
        profileImagePath: user.user_img || "/uploads/default.png",
        firstName: user.first_name,
        lastName: user.last_name,
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

// Inserting Sell Products
exports.Sell = (req, res) => {
  const { fullName, Number, Price, Product, Type } = req.body;
  const productId = req.params.id;

  // Check session userId
  const userId = req.session.userId;
  if (!userId) {
    console.error("Session Error: User ID is missing in the session.");
    return res.redirect("/sign_in");
  }
  // Fetch the product details (id and quantity) from the inventory
  const getProductDetailsSql =
    "SELECT id, Quantity FROM inventery WHERE id = ?";
  db.query(getProductDetailsSql, [productId], (err, result) => {
    if (err) {
      console.error("Database Error (fetch product details):", err);
      return res.status(500).send("Error fetching product details.");
    }
    if (result.length === 0) {
      req.flash("error_msg", "Product not found.");
      return res.redirect("/in_stock");
    }
    const currentQuantity = result[0].Quantity;
    // Check if quantity is available for sale
    if (currentQuantity <= 0) {
      req.flash("error_msg", "Product is out of stock.");
      return res.redirect("/in_stock");
    }
    // Insert the sale record into the sold_items table
    const insertSaleSql =
      "INSERT INTO sold_items (fullName, Number, Price, Product, Type, user_id) VALUES (?, ?, ?, ?, ?, ?)";
    db.query(
      insertSaleSql,
      [fullName, Number, Price, Product, Type, userId],
      (err) => {
        if (err) {
          console.error("Database Error (insert sale):", err);
          return res.status(500).send("Error recording sale.");
        }
        // Decrease the product quantity in the inventory after the sale is recorded
        const updatedQuantity = currentQuantity - 1;
        const updateQuantitySql =
          "UPDATE inventery SET Quantity = ? WHERE id = ?";
        db.query(updateQuantitySql, [updatedQuantity, productId], (err) => {
          if (err) {
            console.error("Database Error (update quantity):", err);
            return res.status(500).send("Error updating product quantity.");
          }
          // If quantity reaches 0, mark the product as sold out
          if (updatedQuantity === 0) {
            const markAsSoldSql =
              'UPDATE inventery SET status = "Sold Out" WHERE id = ?';
            db.query(markAsSoldSql, [productId], (err) => {
              if (err) {
                console.error("Database Error (mark as sold):", err);
                return res.status(500).send("Error marking product as sold.");
              }
            });
          }
          // Flash success message and redirect to in_stock page
          req.flash("success_msg", `${Product} sold successfully!`);
          return res.redirect("/in_stock");
        });
      }
    );
  });
};

// Deleting Sell Products
exports.DeleteProduct = (req, res) => {
  const productId = req.params.id;
  // Fetch the product name before deleting
  const getProductNameSql = "SELECT Product FROM sold_items WHERE id = ?";
  db.query(getProductNameSql, [productId], (err, result) => {
    if (err) {
      console.error("Database Error (fetch product):", err);
      return res
        .status(500)
        .send("An error occurred while fetching the product.");
    }
    if (result.length === 0) {
      req.flash("error_msg", "Product not found!");
      return res.redirect("/sell");
    }
    const productName = result[0].Product;
    const deleteSql = "DELETE FROM sold_items WHERE id = ?";
    db.query(deleteSql, [productId], (err, result) => {
      if (err) {
        console.error("Database Error (delete product):", err);
        return res
          .status(500)
          .send("An error occurred while deleting the product.");
      }
      req.flash("success_msg", `${productName} deleted successfully!`);
      res.redirect("/sell");
    });
  });
};

// update sell products

exports.UpdateProduct = (req, res) => {
  const productId = req.params.id;
  const { fullName, Number, Price, Product, Type } = req.body;

  // Make sure the parameter order matches the SQL query placeholders
  const updateSql =
    "UPDATE sold_items SET fullName = ?, Number = ?, Price = ?, Product = ?, Type = ? WHERE id = ?";

  db.query(
    updateSql,
    [fullName, Number, Price, Product, Type, productId], // Correct order of values
    (err) => {
      if (err) {
        console.error("Database Error (update product):", err);
        return res
          .status(500)
          .send("An error occurred while updating the product.");
      }
      req.flash("success_msg", `${Product} updated successfully!`);
      res.redirect("/sell");
    }
  );
};
