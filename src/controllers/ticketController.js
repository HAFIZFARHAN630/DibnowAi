const User = require("../models/user");
const Category = require("../models/categories");
const Ticket = require("../models/ticket");
const mongoose = require("mongoose");
exports.ticketPage = async (req, res) => {
    try {
         const userId = req.session.userId;
            if (!userId) {
              return res.redirect("/sign_in");
            }
        
            // Fetch user profile data
            const user = await User.findById(userId).select(
              "first_name last_name phone_number email company address user_img plan_name status denial_reason role"
            );
        
            if (!user) {
              return res.render("404", { message: "User not found" });
            }
        
            // Fetch categories
            const categories = await Category.find({ user_id: userId });
        
            // Pass profile data and categories to the view
            res.render("Ticket/tick", {
              profileImagePath: user.user_img || "/uploads/default.png",
              firstName: user.first_name,
              lastName: user.last_name,
              email: user.email,
              categories: categories,
              isUser: user.role === "user",
              isAdmin: user.role === "admin",
              plan_name: user.plan_name || "No Plan",
              success_msg: req.flash("success_msg"),
              error_msg: req.flash("error_msg"),
              status: user.status,
              reson: user.denial_reason,
              notifications: res.locals.notifications || [],
              unreadCount: res.locals.unreadCount || 0,
            });
    } catch (error) {
        console.error("Error rendering ticket page:", error.message);
        res.status(500).send("Internal Server Error");
    }
};


exports.saveTicket = async (req,res) => { 
    try {
        const userId = req.session.userId;
        const {ticketId,title,description,category,status,priority} = req.body
        const newTicket = await Ticket.create({
            ticketId,
            userId,
            title,
            description,
            category,
            status,
            priority
        })
        console.log("Ticket Saved ",newTicket)
        res.redirect("/ticket")
    } catch (error) {
        console.log("Ticket Save Error ",error)
    }
 }

exports.showTickets = async (req,res) => { 
    try {
        const userId = req.session.userId;
            if (!userId) {
              return res.redirect("/sign_in");
            }
            // Fetch user profile data
            const user = await User.findById(userId).select(
              "first_name last_name phone_number email company address user_img plan_name status denial_reason role"
            );
        
            if (!user) {
              return res.render("404", { message: "User not found" });
            }
        
            // Fetch categories
            const categories = await Category.find({ user_id: userId });
            const tickets = await Ticket.find()
        
            // Pass profile data and categories to the view
            res.render("Ticket/showTickets", {
              tickets:tickets,
              profileImagePath: user.user_img || "/uploads/default.png",
              firstName: user.first_name,
              lastName: user.last_name,
              email: user.email,
              categories: categories,
              isUser: user.role === "user",
              isAdmin: user.role === "admin",
              plan_name: user.plan_name || "No Plan",
              success_msg: req.flash("success_msg"),
              error_msg: req.flash("error_msg"),
              status: user.status,
              reson: user.denial_reason,
              notifications: res.locals.notifications || [],
              unreadCount: res.locals.unreadCount || 0,
            });
    } catch (error) {
        console.log("Show tickets error",error)
    }
 }

exports.changeTicketStatus = async (req, res) => {
  try {
    const ticketId = req.query.id;
    const status = req.query.status;

    const update = { status };
    if (status === "Closed") {
      update.closedAt = new Date();   // start 24h timer
    } else {
      update.closedAt = null;         // reset if reopened
    }

    await Ticket.findByIdAndUpdate(ticketId, update);
    res.redirect("/show-tickets");
  } catch (error) {
    console.error("Error changing ticket status", error);
    res.status(500).send("Error updating ticket status");
  }
};


exports.trackTicket = async (req, res) => {
    try {
         const userId = req.session.userId;
            if (!userId) {
              return res.redirect("/sign_in");
            }
        
            // Fetch user profile data
            const user = await User.findById(userId).select(
              "first_name last_name phone_number email company address user_img plan_name status denial_reason role"
            );
        
            if (!user) {
              return res.render("404", { message: "User not found" });
            }
        
            // Fetch categories
            const categories = await Category.find({ user_id: userId });
        
            // Pass profile data and categories to the view
            res.render("Ticket/trackTicket", {
                ticket:null,
              profileImagePath: user.user_img || "/uploads/default.png",
              firstName: user.first_name,
              lastName: user.last_name,
              email: user.email,
              categories: categories,
              isUser: user.role === "user",
              isAdmin: user.role === "admin",
              plan_name: user.plan_name || "No Plan",
              success_msg: req.flash("success_msg"),
              error_msg: req.flash("error_msg"),
              status: user.status,
              reson: user.denial_reason,
              notifications: res.locals.notifications || [],
              unreadCount: res.locals.unreadCount || 0,
            });
    } catch (error) {
        console.error("Error rendering ticket page:", error.message);
        res.status(500).send("Internal Server Error");
    }
};


exports.trackTicketPost = async (req, res) => { 
  try {
    const ticketId = req.body.ticketId; // ✅ match form name
    const ticket = await Ticket.findOne({ ticketId: ticketId }); // ✅ single ticket
    
    const userId = req.session.userId;
    if (!userId) {
      return res.redirect("/sign_in");
    }

    // Fetch user profile data
    const user = await User.findById(userId).select(
      "first_name last_name phone_number email company address user_img plan_name status denial_reason role"
    );

    if (!user) {
      return res.render("404", { message: "User not found" });
    }

    // Fetch categories
    const categories = await Category.find({ user_id: userId });

    // Pass data to view
    res.render("Ticket/trackTicket", {
      ticket: ticket || null, // ✅ pass null if not found
      profileImagePath: user.user_img || "/uploads/default.png",
      firstName: user.first_name,
      lastName: user.last_name,
      email: user.email,
      categories: categories,
      isUser: user.role === "user",
      isAdmin: user.role === "admin",
      plan_name: user.plan_name || "No Plan",
      success_msg: req.flash("success_msg"),
      error_msg: req.flash("error_msg"),
      status: user.status,
      reson: user.denial_reason,
      notifications: res.locals.notifications || [],
      unreadCount: res.locals.unreadCount || 0,
    });
  } catch (error) {
    console.log("error tracking ticket", error);
  }
};