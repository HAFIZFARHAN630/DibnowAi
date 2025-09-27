const express = require("express");
const router = express.Router();
const {ticketPage,saveTicket,showTickets,changeTicketStatus,trackTicket,trackTicketPost} = require("../controllers/ticketController");

router.get("/ticket",ticketPage)
router.post("/save-ticket",saveTicket)
router.get("/show-tickets",showTickets)
router.get("/change-status-ticket", changeTicketStatus)
router.get("/track-ticket", trackTicket)
router.post("/track-ticket-post", trackTicketPost)


module.exports = router;