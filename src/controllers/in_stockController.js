const User = require("../models/user");
const Inventory = require("../models/inventery");
const Category = require("../models/categories");
const Brand = require("../models/brand");

// View all items
exports.viewitems = async (req, res) => {
  try {
    const userId = req.session.userId;
    if (!userId) {
      return res.redirect("/sign_in");
    }

    // Fetch all data concurrently
    const [user, categories, brands, products] = await Promise.all([
      User.findById(userId).select(
        "first_name last_name phone_number email company address user_img plan_name status denial_reason role"
      ),
      Category.find({ user_id: userId }),
      Brand.find({ user_id: userId }),
      Inventory.find({ user_id: userId }).sort({ _id: -1 })
    ]);

    if (!user) {
      return res.redirect("/sign_in");
    }

    res.render("stock/in_stock", {
      profileImagePath: user.user_img || "/uploads/default.png",
      firstName: user.first_name,
      lastName: user.last_name,
      email: user.email,
      company: user.company,
      categories: categories,
      brand: brands,
      products: products,
      plan_name: user.plan_name || "No Plan",
      success_msg: req.flash("success_msg"),
      error_msg: req.flash("error_msg"),
      status: user.status,
      reson: user.denial_reason,
      isAdmin: user.role === "admin",
      isUser: user.role === "user"
    });
  } catch (error) {
    console.error("Error fetching stock data:", error.message);
    return res.render("stock/in_stock", {
      categories: [],
      brand: [],
      products: [],
      error_msg: "Unable to load stock data. Please try again.",
      success_msg: ""
    });
  }
};

// Add new items
exports.additems = async (req, res) => {
  try {
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

    const device_image = req.file ? req.file.filename : "images/different mobiles.jpg";

    // Fetch user's plan and subscription_date
    const user = await User.findById(req.session.userId).select(
      "plan_name subscription_date plan_limit"
    );

    if (!user) {
      req.flash("error_msg", "User not found.");
      return res.redirect("/in_stock");
    }

    if (!user.subscription_date) {
      req.flash("error_msg", "Registration date not available.");
      return res.redirect("/in_stock");
    }

    // Check subscription expiry
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

    // Limit check is handled by middleware

    // Create new inventory item
    const newItem = new Inventory({
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
      user_id: req.session.userId
    });

    await newItem.save();
    
    if (req.xhr || req.headers.accept.indexOf('json') > -1) {
      return res.json({ success: true, message: "Inventory added successfully" });
    }
    
    // Create notification for adding inventory
    if (req.app.locals.notificationService) {
      const user = await User.findById(req.session.userId).select('first_name');
      if (user) {
        await req.app.locals.notificationService.createNotification(
          req.session.userId,
          user.first_name,
          "Add Inventory"
        );
      }
    }
    
    req.flash("success_msg", `${product_name} added successfully`);
    res.redirect("/in_stock");
  } catch (error) {
    console.error("Error adding product:", error.message);
    req.flash("error_msg", "Failed to add product. Please try again.");
    res.redirect("/in_stock");
  }
};

// Update items
exports.updateitems = async (req, res) => {
  try {
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

    const updateData = {
      product_name,
      Model,
      Brand,
      Color,
      Sale_Price,
      Retail_Price,
      imei_number,
      gadget_problem,
      Category,
      Quantity
    };

    if (req.file) {
      updateData.device_image = req.file.filename;
    }

    await Inventory.findByIdAndUpdate(req.params.id, updateData);
    req.flash("success_msg", `${product_name} updated successfully`);
    res.redirect("/in_stock");
  } catch (error) {
    console.error("Error updating product:", error.message);
    req.flash("error_msg", "Failed to update product. Please try again.");
    res.redirect("/in_stock");
  }
};

// Delete an item
exports.deleteitems = async (req, res) => {
  try {
    await Inventory.findByIdAndDelete(req.params.id);
    req.flash("success_msg", "Product deleted successfully");
    res.redirect("/in_stock");
  } catch (error) {
    console.error("Error deleting product:", error.message);
    req.flash("error_msg", "Failed to delete product. Please try again.");
    res.redirect("/in_stock");
  }
};
// all Products Details
exports.desProducts = async (req, res) => {
  try {
    const userId = req.session.userId;
    if (!userId) {
      return res.redirect("/sign_in");
    }

    const productId = req.params.id;
    if (!productId) {
      req.flash("error_msg", "Invalid request: Missing product ID");
      return res.redirect("/in_stock");
    }

    // Fetch user and product concurrently
    const [user, product] = await Promise.all([
      User.findById(userId).select(
        "first_name last_name phone_number email company address user_img plan_name status denial_reason role"
      ),
      Inventory.findById(productId)
    ]);

    if (!user) {
      return res.redirect("/sign_in");
    }

    if (!product) {
      req.flash("error_msg", "Product not found");
      return res.redirect("/in_stock");
    }

    res.render("stock/inStock_details", {
      profileImagePath: user.user_img || "/uploads/default.png",
      firstName: user.first_name,
      lastName: user.last_name,
      email: user.email,
      company: user.company,
      products: [product],
      plan_name: user.plan_name,
      success_msg: req.flash("success_msg"),
      error_msg: req.flash("error_msg"),
      status: user.status,
      reson: user.denial_reason,
      isAdmin: user.role === "admin",
      isUser: user.role === "user"
    });
  } catch (error) {
    console.error("Error fetching product details:", error.message);
    req.flash("error_msg", "Unable to load product details. Please try again.");
    res.redirect("/in_stock");
  }
};
