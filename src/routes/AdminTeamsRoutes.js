const express = require("express");
const router = express.Router();
const { isAuthenticated, isAdmin } = require("../middlewares/authMiddleware");

console.log('AdminTeamsRoutes.js loaded successfully');

const {
  SelectTeam,
  addteams,
  showAddTeamMemberForm,
  addAdminTeamMember,
  updateteam,
  deleteteam,
  getAllAdminTeam,
} = require("../controllers/AdminTeamsController");

router.get("/Teams", isAuthenticated, isAdmin, SelectTeam);
router.post("/Teams", isAuthenticated, isAdmin, addteams);

router.get("/AdminTeam", isAuthenticated, isAdmin, showAddTeamMemberForm);
router.post("/AdminTeam", isAuthenticated, isAdmin, addAdminTeamMember);

router.get("/AllAdminTeam", isAuthenticated, isAdmin, getAllAdminTeam);

// Admin team update and delete routes
router.post("/updateteam", isAuthenticated, isAdmin, updateteam);
router.post("/deleteteam/:id", isAuthenticated, isAdmin, deleteteam);

module.exports = router;