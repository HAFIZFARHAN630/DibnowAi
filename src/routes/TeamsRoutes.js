const express = require("express");
const router = express.Router();
const { isAuthenticated } = require("../middlewares/authMiddleware");

const {
  addteams,
  SelectTeam,
  updateteam,
  deleteteam,
  showAddTeamMemberForm,
  addAdminTeamMember,
} = require("../controllers/TeamsController");

router.get("/Teams", SelectTeam);

router.post("/Teams", addteams);

router.get("/AdminTeam", isAuthenticated, showAddTeamMemberForm);

router.post("/AdminTeam", isAuthenticated, addAdminTeamMember);

module.exports = router;
