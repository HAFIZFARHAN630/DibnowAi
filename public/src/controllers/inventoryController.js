const sql = require("../models/inventery");
const db = require("../config/db");

exports.getInventory = (req, res) => {
  const userId = req.session.userId;
  if (!userId) {
    console.error("User not logged in.");
    return res.redirect("/");
  }

  // Generate days in the current month
  const generateDaysInMonth = (month, year) => {
    const days = [];
    const date = new Date(year, month - 1, 1);
    while (date.getMonth() === month - 1) {
      days.push(
        date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
      );
      date.setDate(date.getDate() + 1);
    }
    return days;
  };

  const currentMonth = new Date().getMonth() + 1; // Current month
  const currentYear = new Date().getFullYear(); // Current year
  const daysInMonth = generateDaysInMonth(currentMonth, currentYear);

  // Fetch user profile
  const profileSql =
    "SELECT first_name, last_name, user_img,plan_name , status,denial_reason, role FROM users WHERE id = ?";
  db.query(profileSql, [userId], (err, profileResult) => {
    if (err) {
      console.error("Error fetching profile:", err);
      return res.render("inventory/inventory", {
        products: [],
        categories: [],
        brand: [],
        solditems: [],
        totalSales: 0,
        totalProfit: 0,
        profileImagePath: "",
        firstName: "",
        lastName: "",
        isUser: false,
        daysInMonth: [],
        plan_name: user.plan_name || "No Plan",
        status: user.status,
        //
        reson: user.denial_reason,
      });
    }

    if (profileResult.length === 0) {
      console.error("No user profile found.");
      return res.render("inventory/inventory", {
        products: [],
        categories: [],
        brand: [],
        solditems: [],
        totalSales: 0,
        totalProfit: 0,
        profileImagePath: "",
        firstName: "",
        lastName: "",
        isUser: false,
        daysInMonth: [],
      });
    }

    const user = profileResult[0];
    const firstName = user.first_name;
    const lastName = user.last_name;
    const profileImagePath = user.user_img || "/uploads/default.png";

    // Fetch categories
    const categoriesSql = "SELECT name FROM categories WHERE user_id = ?";
    db.query(categoriesSql, [userId], (err, categories) => {
      if (err) {
        console.error("Error fetching categories:", err);
        return res.render("inventory/inventory", {
          products: [],
          categories: [],
          brand: [],
          solditems: [],
          totalSales: 0,
          totalProfit: 0,
          profileImagePath,
          firstName,
          lastName,
          daysInMonth,
        });
      }

      // Fetch brands
      const brandSql = "SELECT name FROM brand WHERE user_id = ?";
      db.query(brandSql, [userId], (err, brand) => {
        if (err) {
          console.error("Error fetching brand:", err);
          return res.render("inventory/inventory", {
            products: [],
            categories,
            brand: [],
            solditems: [],
            totalSales: 0,
            totalProfit: 0,
            profileImagePath,
            firstName,
            lastName,
            daysInMonth,
          });
        }

        // Fetch sold items and calculate total sales and profit
        const solditemSql =
          "SELECT Product, Price, Type, sale_date FROM sold_items WHERE user_id = ?";
        db.query(solditemSql, [userId], (err, solditems) => {
          if (err) {
            console.error("Error fetching sold items:", err);
            return res.render("inventory/inventory", {
              products: [],
              categories,
              brand,
              solditems: [],
              totalSales: 0,
              totalProfit: 0,
              profileImagePath,
              firstName,
              lastName,
              daysInMonth,
            });
          }

          // Calculate total sales and profit
          let totalSales = 0;
          let totalProfit = 0;

          solditems.forEach((item) => {
            const salePrice = item.Price; // Assuming "Price" is the sale price
            const retailPrice =
              item.Type === "Retail" ? salePrice * 0.8 : salePrice * 0.7; // Mock logic
            totalSales += salePrice;
            totalProfit += salePrice - retailPrice; // Profit = Sale_Price - Estimated_Cost
          });

          // Fetch products
          const productsSql =
            "SELECT product_name, device_image, Sale_Price, Retail_Price, gadget_problem FROM inventery WHERE user_id = ? ORDER BY device_image DESC LIMIT 10";
          db.query(productsSql, [userId], (err, products) => {
            if (err) {
              console.error("Error fetching products:", err);
              return res.render("inventory/inventory", {
                products: [],
                categories,
                brand,
                solditems,
                totalSales,
                totalProfit,
                profileImagePath,
                firstName,
                lastName,
                daysInMonth,
              });
            }

            // Render the view with all fetched data
            res.render("inventory/inventory", {
              products,
              categories,
              brand,
              solditems,
              totalSales,
              totalProfit,
              profileImagePath,
              firstName,
              lastName,
              daysInMonth,
              isUser: user.role === "user",
              plan_name: user.plan_name || "No Plan",
              status: user.status,
              //
              reson: user.denial_reason,
            });
          });
        });
      });
    });
  });
};
