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
router.get("/team/add", isAuthenticated, addTeamForm);
router.post("/team/add", isAuthenticated, createTeam);
router.get("/team/list", isAuthenticated, listTeams);

// User team update and delete routes
router.post("/userteam/update", isAuthenticated, updateUserTeam);
router.post("/userteam/delete/:id", isAuthenticated, deleteUserTeam);

module.exports = router;