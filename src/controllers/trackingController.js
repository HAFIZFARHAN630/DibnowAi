    const User = require("../models/user")
    const Brand = require("../models/brand")
    const Repair = require("../models/repair")
    const Ticket = require("../models/ticket")
    const mongoose = require("mongoose")




    exports.trackingPage = async (req,res) => { 
        try {
        const userId = req.session.userId;
            if (!userId) {
                return res.redirect("/sign_in");
            }
        
            const user = await User.findById(userId).select(
                "first_name last_name phone_number email company address user_img plan_name status denial_reason role"
            );
        
            if (!user) {
                return res.render("404", { message: "User not found" });
            }
        
            const brands = await Brand.find({ user_id: userId });

        
            res.render("Track/tracking", {
                tracking: null,
                profileImagePath: user.user_img || "/uploads/default.png",
                firstName: user.first_name,
                lastName: user.last_name,
                email: user.email,
                brand: brands,
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
        console.log("Tracking Error:", error);
        }
    }




    exports.trackProduct = async (req, res) => {
    try {
        const userId = req.session.userId;
        if (!userId) return res.redirect("/sign_in");

        const user = await User.findById(userId).select(
        "first_name last_name phone_number email company address user_img plan_name status denial_reason role"
        );
        if (!user) return res.render("404", { message: "User not found" });

        const brands = await Brand.find({ user_id: userId });

        const trackingId = req.body.trackingId?.trim();
        console.log("Track lookup for ID:", trackingId);

        if (!trackingId) {
        req.flash("error_msg", "Please provide a tracking ID.");
        return res.redirect("/tracking");
        }

        // First try to find REPAIR by MongoDB ObjectId (direct _id match)
        let repair = null;
        let ticket = null;
        let foundType = null;

        console.log("🔍 Searching for tracking ID:", trackingId);
        console.log("🔍 Is valid ObjectId:", mongoose.Types.ObjectId.isValid(trackingId));

        if (mongoose.Types.ObjectId.isValid(trackingId)) {
          repair = await Repair.findById(trackingId);
          if (repair) {
            foundType = "repair";
            console.log("✅ Found repair by ObjectId:", repair._id);
          }
        }

        // If not found as repair ObjectId, try to find by random_id field in repairs
        if (!repair && trackingId.length > 0) {
          repair = await Repair.findOne({ random_id: trackingId });
          if (repair) {
            foundType = "repair";
            console.log("✅ Found repair by random_id:", repair._id);
          } else {
            console.log("❌ No repair found with random_id:", trackingId);
          }
        }

        // If still not found as repair, try to find TICKET by ticketId
        if (!repair && trackingId.length > 0) {
          console.log("🔍 Searching for ticket with ID:", trackingId);
          // Try exact match first
          ticket = await Ticket.findOne({ ticketId: trackingId });
          if (ticket) {
            foundType = "ticket";
            console.log("✅ Found ticket by ticketId:", ticket._id);
          } else {
            // Try case-insensitive match for ticketId
            ticket = await Ticket.findOne({
              ticketId: { $regex: new RegExp(`^${trackingId}$`, 'i') }
            });
            if (ticket) {
              foundType = "ticket";
              console.log("✅ Found ticket by case-insensitive ticketId:", ticket._id);
            } else {
              console.log("❌ No ticket found with ticketId:", trackingId);
            }
          }
        }

        if (!repair && !ticket) {
          console.log("❌ No repair or ticket found for tracking ID:", trackingId);
          req.flash("error_msg", `No repair or ticket found with Tracking ID: "${trackingId}"`);
          return res.render("Track/tracking", {
            tracking: null,
            foundType: null,
            profileImagePath: user.user_img || "/uploads/default.png",
            firstName: user.first_name,
            lastName: user.last_name,
            email: user.email,
            brand: brands,
            isUser: user.role === "user",
            isAdmin: user.role === "admin",
            plan_name: user.plan_name || "No Plan",
            success_msg: "",
            error_msg: req.flash("error_msg"),
            status: user.status,
            reson: user.denial_reason,
            notifications: res.locals.notifications || [],
            unreadCount: res.locals.unreadCount || 0,
          });
        }

        console.log(`${foundType} found successfully`);

        // Render result page with repair or ticket details
        return res.render("Track/tracking", {
          tracking: repair || ticket,
          foundType: foundType,
          profileImagePath: user.user_img || "/uploads/default.png",
          firstName: user.first_name,
          lastName: user.last_name,
          email: user.email,
          brand: brands,
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
        console.error("Post Tracking Error", error);
        req.flash("error_msg", "Something went wrong");
        return res.render("Track/tracking", {
          tracking: null,
          foundType: null,
          profileImagePath: user.user_img || "/uploads/default.png",
          firstName: user.first_name,
          lastName: user.last_name,
          email: user.email,
          brand: brands,
          isUser: user.role === "user",
          isAdmin: user.role === "admin",
          plan_name: user.plan_name || "No Plan",
          success_msg: "",
          error_msg: req.flash("error_msg"),
          status: user.status,
          reson: user.denial_reason,
          notifications: res.locals.notifications || [],
          unreadCount: res.locals.unreadCount || 0,
        });
    }
    };