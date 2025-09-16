const User = require("../models/user");
const Brand = require("../models/brand");

exports.getbrand = async (req, res) => {
  try {
    const userId = req.session.userId;
    if (!userId) {
      return res.redirect("/sign_in");
    }

    const user = await User.findById(userId).select(
      "first_name last_name phone_number email company address user_img plan_name status denial_reason role"
    );

    if (!user) {
      return res.render("404", { message: "User not found" });
    }

    const brands = await Brand.find({ user_id: userId });

    res.render("Brand/Brand", {
      profileImagePath: user.user_img || "/uploads/default.png",
      firstName: user.first_name,
      lastName: user.last_name,
      brand: brands,
      isUser: user.role === "user",
      isAdmin: user.role === "admin",
      plan_name: user.plan_name || "No Plan",
      success_msg: req.flash("success_msg"),
      error_msg: req.flash("error_msg"),
      status: user.status,
      reson: user.denial_reason,
      notifications: res.locals.notifications || [],
      unreadCount: res.locals.unreadCount || 0,
    });
  } catch (error) {
    console.error("Error fetching brands:", error.message);
    return res.render("Brand/Brand", {
      brand: [],
      error_msg: "Unable to load brands. Please try again.",
      success_msg: ""
    });
  }
};

exports.addbrand = async (req, res) => {
  try {
    const { name, description } = req.body;
    
    const newBrand = new Brand({
      name,
      description,
      user_id: req.session.userId
    });

    await newBrand.save();
    
    // Create notification for adding brand
    if (req.app.locals.notificationService) {
      const user = await User.findById(req.session.userId).select('first_name');
      if (user) {
        await req.app.locals.notificationService.createNotification(
          req.session.userId,
          user.first_name,
          "Add Brand"
        );
      }
    }
    
    req.flash("success_msg", "Brand added successfully");
    res.redirect("/Brand");
  } catch (error) {
    console.error("Error inserting brand:", error.message);
    req.flash("error_msg", "Failed to add brand. Please try again.");
    res.redirect("/Brand");
  }
};

exports.deletebrand = async (req, res) => {
  try {
    const brandId = req.params.id;
    
    await Brand.findByIdAndDelete(brandId);
    
    // Create notification for deleting brand
    if (req.app.locals.notificationService) {
      const user = await User.findById(req.session.userId).select('first_name');
      if (user) {
        await req.app.locals.notificationService.createNotification(
          req.session.userId,
          user.first_name,
          "Delete Brand"
        );
      }
    }
    
    req.flash("success_msg", "Brand deleted successfully");
    res.redirect("/Brand");
  } catch (error) {
    console.error("Error deleting brand:", error.message);
    req.flash("error_msg", "Failed to delete brand. Please try again.");
    res.redirect("/Brand");
  }
};

exports.update = async (req, res) => {
  try {
    const brandId = req.params.id;
    const { name, description } = req.body;
    
    await Brand.findByIdAndUpdate(brandId, {
      name,
      description
    });
    
    // Create notification for updating brand
    if (req.app.locals.notificationService) {
      const user = await User.findById(req.session.userId).select('first_name');
      if (user) {
        await req.app.locals.notificationService.createNotification(
          req.session.userId,
          user.first_name,
          "Update Brand"
        );
      }
    }
    
    req.flash("success_msg", "Brand updated successfully");
    res.redirect("/Brand");
  } catch (error) {
    console.error("Error updating brand:", error.message);
    req.flash("error_msg", "Failed to update brand. Please try again.");
    res.redirect("/Brand");
  }
};
