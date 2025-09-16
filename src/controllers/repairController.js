const User = require("../models/user");
const Repair = require("../models/repair");
const Category = require("../models/categories");
const Brand = require("../models/brand");

exports.addProduct = async (req, res) => {
  try {
    if (!req.session.userId) {
      console.error("User not logged in or session expired");
      return res.redirect("/sign_in");
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

    // Safeguards for missing data
    const defaultEmail = "hYd2e@example.com";
    const userEmail = email || defaultEmail;
    const deviceImage = req.file ? `/uploads/${req.file.filename}` : "/uploads/1737205923556.jpg";
    const price = Price && !isNaN(Price) ? parseFloat(Price) : 0;
    const randomId = random_id || "0000";

    // Fetch user profile
    const user = await User.findById(req.session.userId).select(
      "plan_name subscription_date plan_limit"
    );

    if (!user) {
      req.flash("error_msg", "User not found.");
      return res.redirect("/repair");
    }

    if (!user.subscription_date) {
      req.flash("error_msg", "Registration date not available.");
      return res.redirect("/repair");
    }

    // Check subscription expiry
    const currentDate = new Date();
    const subscriptionDate = new Date(user.subscription_date);
    const expirationDate = new Date(subscriptionDate);
    expirationDate.setDate(expirationDate.getDate() + 30);

    if (currentDate > expirationDate) {
      req.flash("error_msg", "Your 30-day subscription period has expired. Please renew your subscription.");
      return res.redirect("/pricing");
    }

    // Check stock limit
    const currentStock = await Repair.countDocuments({ user_id: req.session.userId });
    const stockLimit = user.plan_limit || 0;

    if (currentStock >= stockLimit) {
      req.flash("error_msg", "You have reached your stock limit. Please upgrade your plan.");
      return res.redirect("/repair");
    }

    // Create new repair
    const newRepair = new Repair({
      fullName: fullName || "Unknown",
      mobileNumber: mobileNumber || "0000000000",
      brand: brand || "Unknown",
      email: userEmail,
      device: device || "Unknown Device",
      deviceImage,
      status: status || "Pending",
      gadgetProblem: gadgetProblem || "Repair",
      user_id: req.session.userId,
      random_id: randomId,
      Price: price
    });

    await newRepair.save();
    req.flash("success_msg", "Repair product added successfully");
    res.redirect("/repair");
  } catch (error) {
    console.error("Error adding repair product:", error.message);
    req.flash("error_msg", "Failed to add repair product. Please try again.");
    res.redirect("/repair");
  }
};

exports.getRepairProducts = async (req, res) => {
  try {
    const userId = req.session.userId;
    if (!userId) {
      console.error("User is not logged in.");
      return res.redirect("/sign_in");
    }

    // Fetch all data concurrently
    const [user, categories, brands, repairProducts] = await Promise.all([
      User.findById(userId).select(
        "first_name last_name phone_number email company address user_img plan_name status denial_reason role"
      ),
      Category.find({ user_id: userId }),
      Brand.find({ user_id: userId }),
      Repair.find({ user_id: userId }).sort({ _id: -1 })
    ]);

    if (!user) {
      return res.redirect("/sign_in");
    }

    res.render("repair/repair", {
      profileImagePath: user.user_img || "/uploads/default.png",
      firstName: user.first_name,
      lastName: user.last_name,
      company: user.company,
      categories: categories,
      brand: brands,
      products: repairProducts,
      plan_name: user.plan_name || "No Plan",
      success_msg: req.flash("success_msg"),
      error_msg: req.flash("error_msg"),
      status: user.status,
      reson: user.denial_reason,
    });
  } catch (error) {
    console.error("Error fetching repair products:", error.message);
    return res.render("repair/repair", {
      products: [],
      categories: [],
      brand: [],
      error_msg: "Unable to load repair products. Please try again.",
      success_msg: ""
    });
  }
};

exports.deleteProduct = async (req, res) => {
  try {
    const clientId = req.params.id;
    await Repair.findByIdAndDelete(clientId);
    req.flash("success_msg", "Client deleted successfully");
    res.redirect("/repair");
  } catch (error) {
    console.error("Error deleting repair product:", error.message);
    req.flash("error_msg", "Failed to delete client. Please try again.");
    res.redirect("/repair");
  }
};

exports.deleteProducts = async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: "No clients selected for deletion" });
    }

    await Repair.deleteMany({ _id: { $in: ids } });
    req.flash("success_msg", "Clients deleted successfully");
    res.redirect("/repair");
  } catch (error) {
    console.error("Error deleting repair products:", error.message);
    req.flash("error_msg", "Failed to delete clients. Please try again.");
    res.redirect("/repair");
  }
};

exports.updateProduct = async (req, res) => {
  try {
    const productId = req.params.id;
    const { status } = req.body;
    
    await Repair.findByIdAndUpdate(productId, { status });
    req.flash("success_msg", "Status updated successfully");
    res.redirect("/repair");
  } catch (error) {
    console.error("Error updating repair product:", error.message);
    req.flash("error_msg", "Failed to update status. Please try again.");
    res.redirect("/repair");
  }
};

exports.getRepairPrices = async (req, res) => {
  try {
    const userId = req.session.userId;
    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }

    const repairs = await Repair.find({ user_id: userId }).select("Price");
    const prices = repairs.map((repair) => repair.Price);
    res.json(prices);
  } catch (error) {
    console.error("Error fetching repair prices:", error.message);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

exports.getClients = async (req, res) => {
  try {
    const userId = req.session.userId;
    if (!userId) {
      console.error("User is not logged in.");
      return res.redirect("/sign_in");
    }

    // Fetch all data concurrently
    const [user, categories, brands, repairProducts] = await Promise.all([
      User.findById(userId).select(
        "first_name last_name phone_number email company address user_img plan_name status denial_reason role"
      ),
      Category.find({ user_id: userId }),
      Brand.find({ user_id: userId }),
      Repair.find({ user_id: userId }).sort({ _id: -1 })
    ]);

    if (!user) {
      return res.redirect("/sign_in");
    }

    res.render("Clients/Clients", {
      profileImagePath: user.user_img || "/uploads/default.png",
      firstName: user.first_name,
      lastName: user.last_name,
      company: user.company,
      categories: categories,
      brand: brands,
      products: repairProducts,
      plan_name: user.plan_name || "No Plan",
      success_msg: req.flash("success_msg"),
      error_msg: req.flash("error_msg"),
      status: user.status,
      reson: user.denial_reason,
    });
  } catch (error) {
    console.error("Error fetching clients:", error.message);
    return res.render("Clients/Clients", {
      products: [],
      categories: [],
      brand: [],
      error_msg: "Unable to load clients. Please try again.",
      success_msg: ""
    });
  }
};

exports.updateClients = async (req, res) => {
  try {
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

    await Repair.findByIdAndUpdate(client, {
      fullName,
      mobileNumber,
      brand,
      email,
      device,
      status,
      gadgetProblem
    });

    req.flash("success_msg", "Client updated successfully");
    res.redirect("/Clients");
  } catch (error) {
    console.error("Error updating client:", error.message);
    req.flash("error_msg", "Failed to update client. Please try again.");
    res.redirect("/Clients");
  }
};

exports.deleteClients = async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: "No clients selected for deletion" });
    }

    await Repair.deleteMany({ _id: { $in: ids } });
    req.flash("success_msg", "Clients deleted successfully");
    res.redirect("/Clients");
  } catch (error) {
    console.error("Error deleting clients:", error.message);
    req.flash("error_msg", "Failed to delete clients. Please try again.");
    res.redirect("/Clients");
  }
};

exports.deleteClient = async (req, res) => {
  try {
    const clientId = req.params.id;
    await Repair.findByIdAndDelete(clientId);
    req.flash("success_msg", "Client deleted successfully");
    res.redirect("/Clients");
  } catch (error) {
    console.error("Error deleting client:", error.message);
    req.flash("error_msg", "Failed to delete client. Please try again.");
    res.redirect("/Clients");
  }
};

exports.done = async (req, res) => {
  try {
    const repairs = await Repair.find();
    res.render("your-ejs-file", { repairs: repairs });
  } catch (error) {
    console.error("Database error:", error.message);
    return res.status(500).send("Database error");
  }
};