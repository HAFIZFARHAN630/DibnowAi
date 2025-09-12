const User = require("../models/user");
const Category = require("../models/categories");

exports.getcategory = async (req, res) => {
  try {
    const userId = req.session.userId;
    if (!userId) {
      return res.redirect("/sign_in");
    }

    // Fetch user profile data
    const user = await User.findById(userId).select(
      "first_name last_name phone_number email company address user_img plan_name status denial_reason role"
    );

    if (!user) {
      return res.render("404", { message: "User not found" });
    }

    // Fetch categories
    const categories = await Category.find({ user_id: userId });

    // Pass profile data and categories to the view
    res.render("Category/category", {
      profileImagePath: user.user_img || "/uploads/default.png",
      firstName: user.first_name,
      lastName: user.last_name,
      categories: categories,
      isUser: user.role === "user",
      plan_name: user.plan_name || "No Plan",
      success_msg: req.flash("success_msg"),
      error_msg: req.flash("error_msg"),
      status: user.status,
      reson: user.denial_reason,
    });
  } catch (error) {
    console.error("Error fetching categories:", error.message);
    return res.render("Category/category", {
      categories: [],
      error_msg: "Unable to load categories. Please try again.",
      success_msg: ""
    });
  }
};

//

exports.addcategory = async (req, res) => {
  try {
    const { name, description } = req.body;
    
    const newCategory = new Category({
      name,
      description,
      user_id: req.session.userId
    });

    await newCategory.save();
    req.flash("success_msg", "Category added successfully");
    res.redirect("/category");
  } catch (error) {
    console.error("Error inserting category:", error.message);
    req.flash("error_msg", "Failed to add category. Please try again.");
    res.redirect("/category");
  }
};

exports.deletecategory = async (req, res) => {
  try {
    const categoryId = req.params.id;
    
    await Category.findByIdAndDelete(categoryId);
    req.flash("success_msg", "Category deleted successfully");
    res.redirect("/category");
  } catch (error) {
    console.error("Error deleting category:", error.message);
    req.flash("error_msg", "Failed to delete category. Please try again.");
    res.redirect("/category");
  }
};

exports.update = async (req, res) => {
  try {
    const categoryId = req.params.id;
    const { name, description } = req.body;
    
    await Category.findByIdAndUpdate(categoryId, {
      name,
      description
    });
    
    req.flash("success_msg", "Category updated successfully");
    res.redirect("/category");
  } catch (error) {
    console.error("Error updating category:", error.message);
    req.flash("error_msg", "Failed to update category. Please try again.");
    res.redirect("/category");
  }
};
