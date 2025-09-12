const express = require("express");
const router = express.Router();

const {
  addteams,
  SelectTeam,
  updateteam,
  deleteteam,
} = require("../controllers/TeamsController");

router.get("/Teams", SelectTeam);

router.post("/Teams", addteams);

module.exports = router;
