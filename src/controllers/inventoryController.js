const User = require("../models/user");
const Inventory = require("../models/inventery");
const Category = require("../models/categories");
const Brand = require("../models/brand");
const SoldItem = require("../models/Sold_Products");

exports.getSoldItemsAPI = async (req, res) => {
  try {
    const userId = req.session.userId;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const soldItems = await SoldItem.find({ user_id: userId })
      .select("Product Price Type sale_date")
      .sort({ sale_date: -1 });

    return res.json({ soldItems });
  } catch (error) {
    console.error("Error fetching sold items:", error);
    return res.status(500).json({ error: "Server error", soldItems: [] });
  }
};

exports.getInventory = async (req, res) => {
  try {
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

    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();
    const daysInMonth = generateDaysInMonth(currentMonth, currentYear);

    // Fetch user profile
    const user = await User.findById(userId).select(
      "first_name last_name user_img plan_name status denial_reason role"
    );

    if (!user) {
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
        isAdmin: false,
        daysInMonth: [],
      });
    }

    const firstName = user.first_name;
    const lastName = user.last_name;
    const profileImagePath = user.user_img || "/uploads/default.png";

    // Fetch all data concurrently
    const [categories, brands, solditems, products] = await Promise.all([
      Category.find({ user_id: userId }).select("name"),
      Brand.find({ user_id: userId }).select("name"),
      SoldItem.find({ user_id: userId }).select("Product Price Type sale_date"),
      Inventory.find({ user_id: userId })
        .select("product_name device_image Sale_Price Retail_Price gadget_problem")
        .sort({ device_image: -1 })
        .limit(10)
    ]);

    // Calculate total sales and profit
    let totalSales = 0;
    let totalProfit = 0;

    solditems.forEach((item) => {
      const salePrice = item.Price;
      const retailPrice = item.Type === "Retail" ? salePrice * 0.8 : salePrice * 0.7;
      totalSales += salePrice;
      totalProfit += salePrice - retailPrice;
    });

    // Render the view with all fetched data
    res.render("inventory/inventory", {
      products,
      categories,
      brand: brands,
      solditems,
      totalSales,
      totalProfit,
      profileImagePath,
      firstName,
      lastName,
      email: user.email,
      daysInMonth,
      plan_name: user.plan_name || "No Plan",
      status: user.status,
      reson: user.denial_reason,
      isAdmin: user.role === "admin",
      isUser: user.role === "user"
    });
  } catch (error) {
    console.error("Error fetching inventory:", error.message);
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

      daysInMonth: [],
      error_msg: "Unable to load inventory. Please try again."
    });
  }
};
