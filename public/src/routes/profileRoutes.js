const express = require("express");
const router = express.Router();
const { updateImage } = require("../controllers/profileController");
const upload = require("../middlewares/uploadMiddleware");

// update image
router.post("/profile/upload", upload.single("user_img"), updateImage);

module.exports = router;
