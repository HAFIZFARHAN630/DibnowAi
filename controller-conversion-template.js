// CONTROLLER CONVERSION TEMPLATE
// Use this template to convert remaining controllers from MySQL to Mongoose

// 1. UPDATE IMPORTS
// OLD:
// const db = require("../config/db");
// const sql = require("../models/modelName");

// NEW:
const User = require("../models/user");
const ModelName = require("../models/modelName"); // Replace with actual model
// Add other required models

// 2. CONVERT FUNCTIONS FROM CALLBACK TO ASYNC/AWAIT

// OLD PATTERN:
/*
exports.functionName = (req, res) => {
  const sql = "SELECT * FROM table WHERE user_id = ?";
  db.query(sql, [userId], (err, results) => {
    if (err) {
      console.error("Database error:", err);
      return res.status(500).send("Server Error");
    }
    res.render("template", { data: results });
  });
};
*/

// NEW PATTERN:
exports.functionName = async (req, res) => {
  try {
    const userId = req.session.userId;
    if (!userId) {
      return res.redirect("/sign_in");
    }

    const results = await ModelName.find({ user_id: userId });
    
    res.render("template", { 
      data: results,
      success_msg: req.flash("success_msg"),
      error_msg: req.flash("error_msg")
    });
  } catch (error) {
    console.error("Error fetching data:", error.message);
    res.render("template", { 
      data: [],
      error_msg: "Unable to load data. Please try again.",
      success_msg: ""
    });
  }
};

// 3. QUERY CONVERSIONS

// SELECT queries:
// OLD: db.query("SELECT * FROM users WHERE id = ?", [id], callback)
// NEW: await User.findById(id)
// NEW: await User.findOne({ email: email })
// NEW: await User.find({ user_id: userId })

// INSERT queries:
// OLD: db.query("INSERT INTO table (field1, field2) VALUES (?, ?)", [val1, val2], callback)
// NEW: await ModelName.create({ field1: val1, field2: val2 })
// NEW: const newItem = new ModelName({ field1: val1, field2: val2 }); await newItem.save();

// UPDATE queries:
// OLD: db.query("UPDATE table SET field1 = ? WHERE id = ?", [val1, id], callback)
// NEW: await ModelName.findByIdAndUpdate(id, { field1: val1 })
// NEW: await ModelName.updateOne({ _id: id }, { field1: val1 })

// DELETE queries:
// OLD: db.query("DELETE FROM table WHERE id = ?", [id], callback)
// NEW: await ModelName.findByIdAndDelete(id)
// NEW: await ModelName.deleteOne({ _id: id })

// COUNT queries:
// OLD: db.query("SELECT COUNT(*) as total FROM table WHERE user_id = ?", [userId], callback)
// NEW: const count = await ModelName.countDocuments({ user_id: userId })

// 4. ERROR HANDLING PATTERN
/*
try {
  // Your mongoose operations here
  const result = await ModelName.find();
  
  // Success response
  res.render("template", { data: result });
} catch (error) {
  console.error("Operation error:", error.message);
  
  // User-friendly error (never expose database errors)
  req.flash("error_msg", "An error occurred. Please try again.");
  res.redirect("/fallback-route");
}
*/

// 5. IMPORTANT NOTES:
// - MongoDB uses _id instead of id
// - Use ObjectId for foreign key references
// - Always use try-catch for async operations
// - Never expose database errors to users
// - Use flash messages for user feedback
// - Keep EJS templates unchanged