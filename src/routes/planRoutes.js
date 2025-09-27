const express = require("express")

const router = express.Router()
const {createPlanPage,postPlan,deletePlan} = require("../controllers/planController")


router.get("/create-plan",createPlanPage)
router.post("/post-plan",postPlan)
router.post("/delete-plan/:id",deletePlan)


module.exports = router