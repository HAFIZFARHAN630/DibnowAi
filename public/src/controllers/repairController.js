const db = require("../config/db");
const sql = require("../models/repair");

exports.addProduct = (req, res) => {
  if (!req.session.userId) {
    console.error("User not logged in or session expired");
    return res.status(401).send("Unauthorized: Please log in again");
  }

  const {
    fullName,
    mobileNumber,
    brand,
    email,
    device,
    status,
    gadgetProblem,
    Price,
    random_id,
  } = req.body;

  // Safeguard for missing email
  const defaultEmail = "hYd2e@example.com";
  const userEmail = email || defaultEmail;

  // Safeguard for missing or undefined image
  const deviceImage = req.file ? `/uploads/${req.file.filename}` : "/uploads/1737205923556.jpg";

  // Ensure Price is a valid number
  const price = Price && !isNaN(Price) ? parseFloat(Price) : 0; // Default to 0 if invalid or undefined

  // Ensure random_id is not undefined
  const randomId = random_id || "0000"; // Default to "0000" if undefined

  const sqlProfile = "SELECT plan_name, subscription_date FROM users WHERE id = ?";
  
  db.query(sqlProfile, [req.session.userId], (err, profileResult) => {
    if (err) {
      console.error("Database query error (profile):", err);
      return res.status(500).send(err.sqlMessage || err.message || "Internal Server Error");
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
      req.flash("error_msg", "Your 30-day subscription period has expired. Please renew your subscription.");
      return res.redirect("/pricing");
    }

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
        let stockLimit = user.plan_limit || 0;
        callback(null, stockLimit);
      });
    };

    getStockLimit(req.session.userId, (err, stockLimit) => {
      if (err) {
        req.flash("error_msg", "Error retrieving stock limit.");
        return res.redirect("/repair");
      }

      const sqlRepairs = "SELECT COUNT(*) AS total FROM repairs WHERE user_id = ?";
      db.query(sqlRepairs, [req.session.userId], (err, repairsResult) => {
        if (err) {
          console.error("Database query error (repairs):", err);
          return res.status(500).send(err.sqlMessage || err.message || "Internal Server Error");
        }

        const currentStock = repairsResult[0].total;

        if (currentStock >= stockLimit) {
          req.flash("error_msg", "You have reached your stock limit. Please upgrade your plan.");
          return res.redirect("/repair");
        }

        // Insert the new product into the database
        const sqlInsert = `
          INSERT INTO repairs (fullName, mobileNumber, brand, email, device, deviceImage, status, gadgetProblem, user_id, random_id, Price)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

        db.query(
          sqlInsert,
          [
            fullName || "Unknown", // Default value if missing
            mobileNumber || "0000000000", // Default value if missing
            brand || "Unknown", // Default value if missing
            userEmail,
            device || "Unknown Device", // Default value if missing
            deviceImage,
            status || "Pending", // Default value if missing
            gadgetProblem || "Repair", // Default value if missing
            req.session.userId,
            randomId,
            price, // Safeguard to ensure valid price
          ],
          (err) => {
            if (err) {
              console.error("Error inserting product:", err);
              return res.status(500).send(err.sqlMessage || err.message || "An error occurred while adding the repair product");
            }
            req.flash("success_msg", "Repair product added successfully");
            res.redirect("/repair");
          }
        );
      });
    });
  });
};



//
exports.getRepairProducts = (req, res) => {
  const userId = req.session.userId;

  if (!userId) {
    console.error("User is not logged in.");
    return res.redirect("/sign_in");
  }

  // Fetch user profile data
  const sqlProfile =
    "SELECT first_name, last_name, phone_number, email, company, address, user_img,plan_name,  status,denial_reason,role FROM users WHERE id = ?";
  db.query(sqlProfile, [userId], (err, profileResult) => {
    if (err) {
      console.error("Database query error (profile):", err);
      return res.status(500).send("Internal Server Error");
    }

    if (profileResult.length === 0) {
      return res.redirect("/sign_in");
    }

    const user = profileResult[0];

    // Fetch categories and brands concurrently
    const sqlCategories = "SELECT * FROM categories WHERE user_id = ?";
    const sqlBrands = "SELECT * FROM brand WHERE user_id = ?";

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

        // Fetch all repair products
        const sqlQuery =
          "SELECT * FROM repairs WHERE user_id = ? ORDER BY id DESC";
        db.query(sqlQuery, [userId], (err, repairProducts) => {
          // Pass userId here
          if (err) {
            console.error("Database query error (repairs):", err);
            return res
              .status(500)
              .send("An error occurred while fetching repair products");
          }

          // Render the 'repair' page with all the data
          res.render("repair/repair", {
            profileImagePath: user.user_img || "/uploads/default.png",
            firstName: user.first_name,
            lastName: user.last_name,
            company: user.company,
            categories: categories,
            brand: brand,
            isUser: user.role === "user",
            products: repairProducts,
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

// Delete Repair Product
exports.deleteProduct = (req, res) => {
  const clientId = req.params.id;
  const sql = "DELETE FROM repairs WHERE id = ?";

  db.query(sql, [clientId], (err) => {
    if (err) {
      console.error(err);
      return res
        .status(500)
        .json({ error: "An error occurred while deleting the client" });
    }
    req.flash("success_msg", "Client deleted successfully");
    res.redirect("/repair");
  });
};

// Delete Repair Product in bulk
exports.deleteProducts = (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: "No clients selected for deletion" });
  }
  const placeholders = ids.map(() => "?").join(",");
  const sql = `DELETE FROM repairs WHERE id IN (${placeholders})`;

  db.query(sql, ids, (err) => {
    if (err) {
      console.error(err);
      return res
        .status(500)
        .json({ error: "An error occurred while deleting the clients" });
    }
    req.flash("success_msg", "Clients deleted successfully");
    res.redirect("/repair");
  });
};

// update Repair Product
exports.updateProduct = (req, res) => {
  const productId = req.params.id;
  const { status } = req.body;
  const sql = "UPDATE repairs SET status = ? WHERE id = ?";
  db.query(sql, [status, productId], (err, result) => {
    if (err) {
      console.error(err);
      return res
        .status(500)
        .json({ error: "An error occurred while updating the status" });
    }
    req.flash("success_msg", "Status updated successfully");
    res.redirect("/repair");
  });
};

// Get Price
exports.getRepairPrices = (req, res) => {
  const userId = req.session.userId;
  if (!userId) {
    return res.status(400).json({ error: "User ID is required" });
  }
  const sql = "SELECT Price FROM repairs WHERE user_id = ?";
  db.query(sql, [userId], (err, results) => {
    if (err) {
      console.error("Database query error (repair prices):", err);
      return res.status(500).json({ error: "Internal Server Error" });
    }
    const prices = results.map((row) => row.Price);
    res.json(prices);
  });
};
// Get Price

// Get clients // Get clients
exports.getClients = (req, res) => {
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
    // Fetch categories and brands concurrently
    const sqlCategories = "SELECT * FROM categories WHERE user_id = ?";
    const sqlBrands = "SELECT * FROM brand WHERE user_id = ?";
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
        // Fetch all repair products
        const sqlQuery =
          "SELECT * FROM repairs WHERE user_id = ? ORDER BY id DESC";
        db.query(sqlQuery, [userId], (err, repairProducts) => {
          // Pass userId here
          if (err) {
            console.error("Database query error (repairs):", err);
            return res
              .status(500)
              .send("An error occurred while fetching repair products");
          }
          // Render the 'repair' page with all the data
          res.render("Clients/Clients", {
            profileImagePath: user.user_img || "/uploads/default.png",
            firstName: user.first_name,
            lastName: user.last_name,
            company: user.company,
            categories: categories,
            brand: brand,
            products: repairProducts,
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

// update Clients
exports.updateClients = (req, res) => {
  const client = req.params.id;
  const {
    fullName,
    mobileNumber,
    brand,
    email,
    device,
    status,
    gadgetProblem,
  } = req.body;
  const sql =
    "UPDATE repairs SET fullName = ?, mobileNumber = ?, brand = ?, email = ?, device = ?, status = ?, gadgetProblem = ? WHERE id = ?";
  db.query(
    sql,
    [
      fullName,
      mobileNumber,
      brand,
      email,
      device,
      status,
      gadgetProblem,
      client,
    ],
    (err) => {
      if (err) {
        console.error(err);
        return res
          .status(500)
          .json({ error: "An error occurred while updating the client" });
      }
      req.flash("success_msg", "Client updated successfully");
      res.redirect("/Clients");
    }
  );
};

// Delete clients in bulk
exports.deleteClients = (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: "No clients selected for deletion" });
  }
  const placeholders = ids.map(() => "?").join(",");
  const sql = `DELETE FROM repairs WHERE id IN (${placeholders})`;

  db.query(sql, ids, (err) => {
    if (err) {
      console.error(err);
      return res
        .status(500)
        .json({ error: "An error occurred while deleting the clients" });
    }
    req.flash("success_msg", "Clients deleted successfully");
    res.redirect("/Clients");
  });
};

// Individual client deletion (handled by the form)
exports.deleteClient = (req, res) => {
  const clientId = req.params.id;
  const sql = "DELETE FROM repairs WHERE id = ?";

  db.query(sql, [clientId], (err) => {
    if (err) {
      console.error(err);
      return res
        .status(500)
        .json({ error: "An error occurred while deleting the client" });
    }
    req.flash("success_msg", "Client deleted successfully");
    res.redirect("/Clients");
  });
};

exports.done = (req, res) => {
  const sql = "SELECT * FROM repairs"; // Modify this query based on your logic

  db.query(sql, (err, results) => {
    if (err) {
      console.error("Database error:", err);
      return res.status(500).send("Database error");
    }

    res.render("your-ejs-file", { repairs: results }); // Pass repairs to EJS
  });
};
