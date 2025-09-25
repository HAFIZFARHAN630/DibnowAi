const express = require("express");
const router = express.Router();
const { isAuthenticated } = require("../middlewares/authMiddleware");

console.log('TeamsRoutes.js loaded successfully');

const {
  addteams,
  SelectTeam,
  updateteam,
  deleteteam,
  showAddTeamMemberForm,
  addAdminTeamMember,
  addTeamForm,
  createTeam,
  listTeams,
} = require("../controllers/TeamsController");

router.get("/Teams", SelectTeam);

router.post("/Teams", addteams);

router.get("/AdminTeam", isAuthenticated, showAddTeamMemberForm);

router.post("/AdminTeam", isAuthenticated, addAdminTeamMember);

// Test routes without authentication first
router.post("/updateteam", updateteam);
router.post("/deleteteam/:id", deleteteam);

// User team management routes
router.get("/team/add", isAuthenticated, addTeamForm);
router.post("/team/add", isAuthenticated, createTeam);
router.get("/team/list", isAuthenticated, listTeams);

// Add test routes to verify they work
router.get("/test-update", (req, res) => {
  res.json({ message: "Update route is working" });
});

router.get("/test-delete", (req, res) => {
  res.json({ message: "Delete route is working" });
});

module.exports = router;
