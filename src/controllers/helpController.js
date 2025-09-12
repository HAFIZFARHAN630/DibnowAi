const User = require("../models/user");
const Category = require("../models/categories");
const Brand = require("../models/brand");
const Inventory = require("../models/inventery");

exports.plan = async (req, res) => {
  try {
    const userId = req.session.userId;
    if (!userId) {
      return res.redirect("/sign_in");
    }

    // Fetch user profile
    const user = await User.findById(userId).select(
      "first_name last_name phone_number email company address user_img plan_name status denial_reason role"
    );

    if (!user) {
      return res.redirect("/sign_in");
    }

    // Fetch all data concurrently
    const [categories, brands, products] = await Promise.all([
      Category.find({ user_id: userId }),
      Brand.find({ user_id: userId }),
      Inventory.find({ user_id: userId }).sort({ _id: -1 })
    ]);

    res.render("Help/Help", {
      profileImagePath: user.user_img || "/uploads/default.png",
      firstName: user.first_name,
      lastName: user.last_name,
      company: user.company,
      categories: categories,
      brand: brands,
      products: products,
      isUser: user.role === "user",
      plan_name: user.plan_name || "No Plan",
      success_msg: req.flash("success_msg"),
      error_msg: req.flash("error_msg"),
      status: user.status,
      reson: user.denial_reason,
    });
  } catch (error) {
    console.error("Error fetching help data:", error.message);
    return res.render("Help/Help", {
      categories: [],
      brand: [],
      products: [],
      error_msg: "Unable to load data. Please try again.",
      success_msg: ""
    });
  }
};
