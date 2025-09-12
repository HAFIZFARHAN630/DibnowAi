const db = require("../config/db");
const sql = require("../models/inventery");

// View all items
exports.viewitems = (req, res) => {
  const userId = req.session.userId;
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
          res.render("stock/in_stock", {
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

// Add new items
exports.additems = (req, res) => {
  const {
    product_name,
    Model,
    Brand,
    Color,
    Sale_Price,
    Retail_Price,
    imei_number,
    gadget_problem,
    Category,
    Quantity,
  } = req.body;

  // Assign dummy image if no image is uploaded
  const device_image = req.file
    ? req.file.filename
    : "images/different mobiles.jpg";

  // Fetch user's plan and subscription_date
  const sqlProfile =
    "SELECT plan_name, subscription_date FROM users WHERE id = ?";
  db.query(sqlProfile, [req.session.userId], (err, profileResult) => {
    if (err) {
      console.error("Database query error (profile):", err);
      return res.status(500).send("Internal Server Error");
    }

    const user = profileResult[0];

    if (!user) {
      req.flash("error_msg", "User not found.");
      return res.redirect("/in_stock");
    }

    if (!user.subscription_date) {
      req.flash("error_msg", "Registration date not available.");
      return res.redirect("/in_stock");
    }

    const currentDate = new Date();
    const subscriptionDate = new Date(user.subscription_date);
    const expirationDate = new Date(subscriptionDate);
    expirationDate.setDate(expirationDate.getDate() + 30);

    if (currentDate > expirationDate) {
      req.flash(
        "error_msg",
        "Your 30-day subscription period has expired. Please renew your subscription."
      );
      return res.redirect("/pricing");
    }

    // Fetch stock limit based on the user's plan
    const getStockLimit = (userId, callback) => {
      const sql = "SELECT plan_name, plan_limit FROM users WHERE id = ?";
      db.query(sql, [userId], (err, result) => {
        if (err) {
          console.error("Database query error (stock limit):", err);
          return callback(err);
        }

        if (result.length === 0) {
          console.log("User not found");
          return callback(null, 0);
        }

        const user = result[0];
        let stockLimit = user.plan_limit || 0; // Ensure it's a number

        callback(null, stockLimit);
      });
    };

    // Fetch current stock count
    const sqlItems =
      "SELECT COUNT(*) AS count FROM inventery WHERE user_id = ?";
    db.query(sqlItems, [req.session.userId], (err, itemsResult) => {
      if (err) {
        console.error("Database query error (inventory):", err);
        return res.status(500).send("Internal Server Error");
      }

      getStockLimit(req.session.userId, (err, stockLimit) => {
        if (err) {
          console.error("Error getting stock limit:", err);
          return res.status(500).send("Internal Server Error");
        }

        const currentStock = itemsResult[0].count;

        if (currentStock >= stockLimit) {
          req.flash("error_msg", "Stock limit exceeded. Upgrade your plan.");
          return res.redirect("/in_stock");
        }

        // Proceed to add item
        const sql = `INSERT INTO inventery 
          (product_name, Model, Brand, Color, Sale_Price, Retail_Price, imei_number, gadget_problem, device_image, Category, Quantity, user_id) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

        db.query(
          sql,
          [
            product_name,
            Model,
            Brand,
            Color,
            Sale_Price,
            Retail_Price,
            imei_number,
            gadget_problem,
            device_image,
            Category,
            Quantity,
            req.session.userId,
          ],
          (err, result) => {
            if (err) {
              console.error("Error adding product:", err);
              req.flash("error_msg", "Error adding product");
              return res.redirect("/in_stock");
            }
            req.flash("success_msg", `${product_name} added successfully`);
            res.redirect("/in_stock");
          }
        );
      });
    });
  });
};

//

// Update items
exports.updateitems = (req, res) => {
  const {
    product_name,
    Model,
    Brand,
    Color,
    Sale_Price,
    Retail_Price,
    imei_number,
    gadget_problem,
    Category,
    Quantity,
  } = req.body;

  const device_image = req.file ? req.file.filename : null;
  const updateSql = device_image
    ? `UPDATE inventery SET product_name = ?, Model = ?, Brand = ?, Color = ?, Sale_Price = ?, Retail_Price = ?, imei_number = ?, gadget_problem = ?, Category = ?, device_image = ?, Quantity = ? WHERE id = ?`
    : `UPDATE inventery SET product_name = ?, Model = ?, Brand = ?, Color = ?, Sale_Price = ?, Retail_Price = ?, imei_number = ?, gadget_problem = ?, Category = ?, Quantity = ? WHERE id = ?`;

  const params = device_image
    ? [
        product_name,
        Model,
        Brand,
        Color,
        Sale_Price,
        Retail_Price,
        imei_number,
        gadget_problem,
        Category,
        device_image,
        Quantity,
        req.params.id,
      ]
    : [
        product_name,
        Model,
        Brand,
        Color,
        Sale_Price,
        Retail_Price,
        imei_number,
        gadget_problem,
        Category,
        Quantity,
        req.params.id,
      ];

  db.query(updateSql, params, (err, result) => {
    if (err) {
      console.error("Database query error (update items):", err);
      req.flash("error_msg", "Error updating product");
      return res.redirect("/in_stock");
    }
    req.flash("success_msg", `${product_name} updated successfully`);
    res.redirect("/in_stock");
  });
};

// Delete an item
exports.deleteitems = (req, res) => {
  const deleteSql = "DELETE FROM inventery WHERE id = ?";
  db.query(deleteSql, [req.params.id], (err, result) => {
    if (err) {
      req.flash("error_msg", "Error deleting product");
      return res.redirect("/in_stock");
    }
    req.flash("success_msg", `Product deleted successfully`);
    res.redirect("/in_stock");
  });
};
// all Products Details

// View all items
exports.desProducts = (req, res) => {
  const userId = req.session.userId;

  if (!userId) {
    return res.redirect("/sign_in");
  }

  // Fetch user profile data
  const sqlProfile = `
        SELECT first_name, last_name, phone_number, email, company, address, user_img,plan_name, status,denial_reason,role
        FROM users 
        WHERE id = ?`;
  db.query(sqlProfile, [userId], (err, profileResult) => {
    if (err) {
      console.error("Database query error (profile):", err);
      return res.status(500).send("Internal Server Error");
    }

    if (profileResult.length === 0) {
      return res.redirect("/sign_in");
    }

    const user = profileResult[0];
    const ides = req.params.id;

    // Validate id parameter
    if (!ides) {
      return res.status(400).send("Invalid request: Missing product ID");
    }

    // Fetch product by id
    const sqlItems = `
            SELECT * 
            FROM inventery 
            WHERE  id = ?`;
    db.query(sqlItems, [ides], (err, itemsResult) => {
      if (err) {
        console.error("Database query error (inventory):", err);
        return res.status(500).send("Internal Server Error");
      }

      if (itemsResult.length === 0) {
        return res.status(404).send("Product not found");
      }

      // Render the 'in_stock' page with fetched data
      res.render("stock/inStock_details", {
        profileImagePath: user.user_img || "/uploads/default.png",
        firstName: user.first_name,
        lastName: user.last_name,
        company: user.company,
        products: itemsResult,
        isUser: user.role === "user",
        plan_name: user.plan_name,
        success_msg: req.flash("success_msg"),
        error_msg: req.flash("error_msg"),
        status: user.status,
        //
        reson: user.denial_reason,
      });
    });
  });
};
