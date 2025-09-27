    const User = require("../models/user")
    const Brand = require("../models/brand")
    const Reapir = require("../models/repair")
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

        const trackingId = req.body.trackingId 
        console.log("Track lookup for _id:", trackingId);

        // Validate ObjectId format first
        if (!mongoose.Types.ObjectId.isValid(trackingId)) {
        req.flash("error_msg", "Invalid tracking id format — paste the Mongo _id.");
        return res.redirect("/tracking");
        }

        const tracking = await Reapir.findById(trackingId);
        console.log("Tracking result:", tracking);

        if (!tracking) {
        req.flash("error_msg", "Tracking ID not found");
        return res.redirect("/tracking");
        }

        return res.render("Track/tracking", {
        tracking,
        profileImagePath: user.user_img || "/uploads/default.png",
        firstName: user.first_name,
        lastName: user.last_name,
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
        return res.redirect("/tracking");
    }
    };