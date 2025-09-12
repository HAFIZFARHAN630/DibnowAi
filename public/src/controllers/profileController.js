const db = require("../config/db");

//update image
exports.updateImage = (req, res) => {
  if (!req.file) {
    console.error("No file uploaded");
    return res.status(400).send("No file uploaded");
  }
  const profileImagePath = "/uploads/" + req.file.filename;
  const userId = req.session.userId;
  const sql = `UPDATE users SET user_img = ? WHERE id = ?`;
  db.query(sql, [profileImagePath, userId], (err, result) => {
    if (err) {
      console.error("Database update error:", err);
      return res.status(500).send("Failed to update profile image");
    }
    res.redirect("/Setting");
  });
};
