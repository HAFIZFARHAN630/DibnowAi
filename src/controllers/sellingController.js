const User = require("../models/user");
const SoldItem = require("../models/Sold_Products");
const Inventory = require("../models/inventery");

// Selecting Sell Products
exports.SelectSell = async (req, res) => {
  try {
    const userId = req.session.userId;
    if (!userId) {
      console.error("User is not logged in.");
      return res.redirect("/sign_in");
    }

    // Fetch user profile and sold items concurrently
    const [user, products] = await Promise.all([
      User.findById(userId).select(
        "first_name last_name phone_number email company address user_img plan_name status denial_reason role"
      ),
      SoldItem.find({ user_id: userId }).sort({ _id: -1 })
    ]);

    if (!user) {
      return res.redirect("/sign_in");
    }

    res.render("Sell_Products/sell", {
      products: products,
      profileImagePath: user.user_img || "/uploads/default.png",
      firstName: user.first_name,
      lastName: user.last_name,
      email: user.email,
      isUser: user.role === "user",
      plan_name: user.plan_name || "No Plan",
      success_msg: req.flash("success_msg"),
      error_msg: req.flash("error_msg"),
      status: user.status,
      reson: user.denial_reason,
    });
  } catch (error) {
    console.error("Error fetching sell products:", error.message);
    return res.render("Sell_Products/sell", {
      products: [],
      profileImagePath: "/uploads/default.png",
      firstName: "User",
      lastName: "",
      email: "",
      isUser: true,
      plan_name: "No Plan",
      status: "active",
      reson: null,
      error_msg: "Unable to load products. Please try again.",
      success_msg: ""
    });
  }
};

// Inserting Sell Products
exports.Sell = async (req, res) => {
  try {
    const { fullName, Number, Price, Product, Type } = req.body;
    const productId = req.params.id;
    const userId = req.session.userId;
    
    if (!userId) {
      console.error("Session Error: User ID is missing in the session.");
      return res.redirect("/sign_in");
    }

    // Fetch product details
    const product = await Inventory.findById(productId).select("Quantity");
    if (!product) {
      req.flash("error_msg", "Product not found.");
      return res.redirect("/in_stock");
    }

    const currentQuantity = product.Quantity;
    if (currentQuantity <= 0) {
      req.flash("error_msg", "Product is out of stock.");
      return res.redirect("/in_stock");
    }

    // Create sale record
    const newSale = new SoldItem({
      fullName,
      Number,
      Price,
      Product,
      Type,
      user_id: userId
    });
    await newSale.save();

    // Update inventory quantity
    const updatedQuantity = currentQuantity - 1;
    const updateData = { Quantity: updatedQuantity };
    
    if (updatedQuantity === 0) {
      updateData.status = "Sold Out";
    }
    
    await Inventory.findByIdAndUpdate(productId, updateData);

    // Create notification for making a sale
    if (req.app.locals.notificationService) {
      const user = await User.findById(userId).select('first_name');
      if (user) {
        await req.app.locals.notificationService.createNotification(
          userId,
          user.first_name,
          "Make Sale"
        );
      }
    }
    
    // Create notification for moving item to out-stock if quantity is 0
    if (updatedQuantity === 0 && req.app.locals.notificationService) {
      const user = await User.findById(userId).select('first_name');
      if (user) {
        await req.app.locals.notificationService.createNotification(
          userId,
          user.first_name,
          "Move to Out-stock"
        );
      }
    }

    req.flash("success_msg", `${Product} sold successfully!`);
    return res.redirect("/in_stock");
  } catch (error) {
    console.error("Error processing sale:", error.message);
    req.flash("error_msg", "Failed to process sale. Please try again.");
    return res.redirect("/in_stock");
  }
};

// Deleting Sell Products
exports.DeleteProduct = async (req, res) => {
  try {
    const productId = req.params.id;
    
    // Fetch product name before deleting
    const product = await SoldItem.findById(productId).select("Product");
    if (!product) {
      req.flash("error_msg", "Product not found!");
      return res.redirect("/sell");
    }
    
    const productName = product.Product;
    await SoldItem.findByIdAndDelete(productId);
    
    req.flash("success_msg", `${productName} deleted successfully!`);
    res.redirect("/sell");
  } catch (error) {
    console.error("Error deleting product:", error.message);
    req.flash("error_msg", "Failed to delete product. Please try again.");
    res.redirect("/sell");
  }
};

// update sell products
exports.UpdateProduct = async (req, res) => {
  try {
    const productId = req.params.id;
    const { fullName, Number, Price, Product, Type } = req.body;

    await SoldItem.findByIdAndUpdate(productId, {
      fullName,
      Number,
      Price,
      Product,
      Type
    });

    req.flash("success_msg", `${Product} updated successfully!`);
    res.redirect("/sell");
  } catch (error) {
    console.error("Error updating product:", error.message);
    req.flash("error_msg", "Failed to update product. Please try again.");
    res.redirect("/sell");
  }
};
