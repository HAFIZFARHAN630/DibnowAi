# MongoDB Migration Guide

## ✅ COMPLETED MIGRATIONS

### 1. Database Connection
- ✅ Updated `src/config/db.js` to use Mongoose
- ✅ Added MongoDB URI to `.env` file

### 2. Models Converted
- ✅ `src/models/user.js` - User schema
- ✅ `src/models/categories.js` - Category schema  
- ✅ `src/models/brand.js` - Brand schema
- ✅ `src/models/repair.js` - Repair schema
- ✅ `src/models/inventery.js` - Inventory schema
- ✅ `src/models/help.js` - Message schema
- ✅ `src/models/adduser.js` - AddUser schema
- ✅ `src/models/Sold_Products.js` - SoldItem schema

### 3. Controllers Converted
- ✅ `src/controllers/authController.js` - Authentication (signup, signin, forgot password)
- ✅ `src/controllers/categoryController.js` - Category CRUD operations
- ✅ `src/middlewares/authMiddleware.js` - Authentication middleware

## 🔄 REMAINING CONTROLLERS TO CONVERT

Run the following commands to complete the migration:

### Step 1: Install Dependencies
```bash
npm install mongoose
```

### Step 2: Start MongoDB
Make sure MongoDB is running on your system:
- Default connection: `mongodb://127.0.0.1:27017/products`

### Step 3: Convert Remaining Controllers
The following controllers need to be converted using the same pattern:

#### Pattern for Conversion:
```javascript
// OLD MySQL Pattern
const db = require("../config/db");
db.query("SELECT * FROM table WHERE id = ?", [id], (err, result) => {
  // handle result
});

// NEW Mongoose Pattern  
const Model = require("../models/modelName");
const result = await Model.find({ _id: id });
```

#### Controllers to Convert:
1. `src/controllers/Brand_Controller.js`
2. `src/controllers/repairController.js`
3. `src/controllers/inventoryController.js`
4. `src/controllers/helpController.js`
5. `src/controllers/adminController.js`
6. `src/controllers/profileController.js`
7. `src/controllers/indexController.js`
8. `src/controllers/pricingController.js`
9. `src/controllers/sellingController.js`
10. `src/controllers/settingController.js`
11. `src/controllers/TeamsController.js`
12. `src/controllers/requestController.js`
13. `src/controllers/in_stockController.js`

## 🔧 CONVERSION RULES

### MySQL to Mongoose Query Conversion:
- `SELECT *` → `Model.find()`
- `SELECT * WHERE id = ?` → `Model.findById(id)` or `Model.findOne({field: value})`
- `INSERT INTO` → `Model.create()` or `new Model().save()`
- `UPDATE WHERE` → `Model.findByIdAndUpdate()` or `Model.updateOne()`
- `DELETE WHERE` → `Model.findByIdAndDelete()` or `Model.deleteOne()`

### Error Handling:
- Always use try-catch blocks
- Never expose database errors to users
- Use flash messages for user feedback
- Log errors to console for debugging

### Example Conversion:
```javascript
// OLD
exports.getItems = (req, res) => {
  const sql = "SELECT * FROM items WHERE user_id = ?";
  db.query(sql, [req.session.userId], (err, results) => {
    if (err) {
      return res.status(500).send("Server Error");
    }
    res.render("items", { items: results });
  });
};

// NEW
exports.getItems = async (req, res) => {
  try {
    const items = await Item.find({ user_id: req.session.userId });
    res.render("items", { items: items });
  } catch (error) {
    console.error("Error fetching items:", error.message);
    res.render("items", { 
      items: [], 
      error_msg: "Unable to load items. Please try again." 
    });
  }
};
```

## 🚀 TESTING

After conversion:
1. Start your application: `npm start`
2. Test all major functions:
   - User registration/login
   - Category management
   - All CRUD operations
   - File uploads
   - Search functionality

## 📝 NOTES

- MongoDB uses `_id` instead of `id`
- All foreign key references should use `ObjectId`
- Dates are handled automatically by Mongoose
- No need to create tables - Mongoose handles schema creation
- Keep EJS templates unchanged - only backend logic changes

## ⚠️ IMPORTANT

- Backup your data before migration
- Test thoroughly in development environment
- MongoDB must be running before starting the application
- Update any hardcoded SQL queries in other files