const express = require("express");
const router = express.Router();
const { checkPermission } = require("../middlewares/permissionMiddleware");
const {ticketPage,saveTicket,showTickets,changeTicketStatus,trackTicket,trackTicketPost} = require("../controllers/ticketController");

router.get("/ticket", checkPermission('tickets'), ticketPage)
router.post("/save-ticket", checkPermission('tickets'), saveTicket)
router.get("/show-tickets", checkPermission('tickets'), showTickets)
router.get("/change-status-ticket", changeTicketStatus)
router.get("/track-ticket", trackTicket)
router.post("/track-ticket-post", trackTicketPost)


module.exports = router;