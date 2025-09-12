const User = require("../models/user");

//update image
exports.updateImage = async (req, res) => {
  try {
    if (!req.file) {
      console.error("No file uploaded");
      req.flash("error_msg", "No file uploaded. Please select an image.");
      return res.redirect("/Setting");
    }
    
    const profileImagePath = "/uploads/" + req.file.filename;
    const userId = req.session.userId;
    
    await User.findByIdAndUpdate(userId, { user_img: profileImagePath });
    
    req.flash("success_msg", "Profile image updated successfully!");
    res.redirect("/Setting");
  } catch (error) {
    console.error("Error updating profile image:", error.message);
    req.flash("error_msg", "Failed to update profile image. Please try again.");
    res.redirect("/Setting");
  }
};
