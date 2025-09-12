const db = require("../config/db");

exports.allusers = async (req, res) => {
  const userId = req.session.userId;

  if (!userId) {
    req.flash("error_msg", "Please log in first.");
    return res.redirect("/sign_in");
  }

  try {
    const [profileResult] = await db.promise().query(
      `SELECT first_name, last_name, phone_number, email, company, address, user_img, country, currency, plan_name, role,status,denial_reason
       FROM users WHERE id = ?`,
      [userId]
    );

    if (profileResult.length === 0) {
      req.flash("error_msg", "User not found.");
      return res.redirect("/sign_in");
    }

    const user = profileResult[0];
    const isAdmin = user.role === "admin";
    const isUser = user.role === "user";

    const [
      [repairs],
      [inventory],
      [[{ productCount } = { productCount: 0 }]],
      [[{ soldCount } = { soldCount: 0 }]],
      [[{ repairCount } = { repairCount: 0 }]],
      [[{ pendingOrders } = { pendingOrders: 0 }]],
      [[{ completedRepairs } = { completedRepairs: 0 }]],
      [teams],
      [[{ teamCount } = { teamCount: 0 }]],
      [[{ totalSales = 0, totalRepairs = 0 }]],
    ] = await Promise.all([
      db
        .promise()
        .query(`SELECT * FROM repairs WHERE user_id = ? ORDER BY id DESC`, [
          userId,
        ]),
      db
        .promise()
        .query(`SELECT * FROM inventery WHERE user_id = ? ORDER BY id DESC`, [
          userId,
        ]),
      db
        .promise()
        .query(
          `SELECT COUNT(*) AS productCount FROM inventery WHERE user_id = ?`,
          [userId]
        ),
      db
        .promise()
        .query(
          `SELECT COUNT(*) AS soldCount FROM sold_items WHERE user_id = ?`,
          [userId]
        ),
      db
        .promise()
        .query(
          `SELECT COUNT(*) AS repairCount FROM repairs WHERE user_id = ?`,
          [userId]
        ),
      db
        .promise()
        .query(
          `SELECT COUNT(*) AS pendingOrders FROM repairs WHERE status = 'Pending' AND user_id = ?`,
          [userId]
        ),
      db
        .promise()
        .query(
          `SELECT COUNT(*) AS completedRepairs FROM repairs WHERE status = 'Completed' AND user_id = ?`,
          [userId]
        ),
      db.promise().query(`SELECT name FROM addusers`),
      db.promise().query(`SELECT COUNT(*) AS teamCount FROM addusers`),
      db
        .promise()
        .query(
          `SELECT SUM(price) AS totalSales, COUNT(*) AS totalRepairs FROM repairs WHERE status = 'Delivered'`
        ),
    ]);

    const profileImagePath = user.user_img
      ? user.user_img
      : "/uploads/default.png";

    res.render("index", {
      profileImagePath,
      firstName: user.first_name,
      lastName: user.last_name,
      products: repairs,
      inventory,
      productCount,
      soldCount,
      repairCount,
      pendingOrders,
      completedRepairs,
      teamCount,
      teams,
      isAdmin,
      status: user.status,
      //
      reson: user.denial_reason,
      //
      isUser,
      plan_name: user.plan_name || "No Plan",
      totalSales,
      totalRepairs,
      success_msg: req.flash("success_msg"),
      error_msg: req.flash("error_msg"),
    });
  } catch (err) {
    req.flash("error_msg", "Internal server error.");
    res.redirect("/sign_in");
  }
};

// accept the Status
exports.accept = async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res
        .status(400)
        .json({ success: false, message: "User ID is required." });
    }
    const [result] = await db
      .promise()
      .query("UPDATE users SET status = 'Accepted' WHERE id = ?", [userId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found or already accepted.",
      });
    }
    req.flash("success_msg", "User request has been accepted!");

    res.json({ success: true, message: "User request accepted successfully." });
  } catch (error) {
    req.flash("error_msg", "Server error while accepting user request.");
    res.status(500).json({ success: false, message: error.message });
  }
};
