const express = require("express")

const router = express.Router()
const {createPlanPage,postPlan,deletePlan,editPlan,updatePlan} = require("../controllers/planController")


router.get("/create-plan",createPlanPage)
router.post("/post-plan",postPlan)
router.post("/delete-plan/:id",deletePlan)
router.get("/edit-plan/:id",editPlan)
router.post("/update-plan/:id",updatePlan)



module.exports = router