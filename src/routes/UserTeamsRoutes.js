const express = require("express");
const router = express.Router();
const { isAuthenticated } = require("../middlewares/authMiddleware");

console.log('UserTeamsRoutes.js loaded successfully');

const {
  addTeamForm,
  createTeam,
  listTeams,
  updateUserTeam,
  deleteUserTeam,
} = require("../controllers/UserTeamsController");

// User team management routes
router.get("/userteam/add", isAuthenticated, addTeamForm);
router.post("/userteam/add", isAuthenticated, createTeam);
router.get("/userteam/list", isAuthenticated, listTeams);

// User team update and delete routes
router.post("/userteam/update/:id", isAuthenticated, updateUserTeam); // ✅ Fixed (added :id param)
router.post("/userteam/delete/:id", isAuthenticated, deleteUserTeam);

module.exports = router;
