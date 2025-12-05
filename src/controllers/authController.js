
const User = require("../models/user");
const PlanRequest = require("../models/planRequest");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
  const { sendConfirmationEmail, sendForgotPasswordEmail, sendLogoutEmail } = require("../../emailService");
// Signup
exports.signup = async (req, res) => {
    try {
      const {
        first_name,
        last_name,
        email,
        phone_number,
        password,
        company,
        address,
        postcode,
        website
      } = req.body;

      // CRITICAL: Block fake users FIRST
      const emailLower = (email || "").toLowerCase();
      const firstNameLower = (first_name || "").toLowerCase();
      const lastNameLower = (last_name || "").toLowerCase();
      const companyLower = (company || "").toLowerCase();

      // Honeypot check
      if (website) {
        console.log("❌ BLOCKED: Honeypot filled:", email);
        return res.status(400).render("Sigin/sign_up", {
          message: "Invalid submission. Please try again.",
        });
      }

      // Block fake emails
      if (
        emailLower.includes("example.com") ||
        emailLower.includes("testf") ||
        emailLower.includes("load") ||
        /test\w*\d+@/.test(emailLower) ||
        /load\d+@/.test(emailLower) ||
        /comp\d+@/.test(emailLower)
      ) {
        console.log("❌ BLOCKED: Fake email:", email);
        return res.status(400).render("Sigin/sign_up", {
          message: "Invalid email. Please use a valid email address.",
        });
      }

      // Block fake names
      if (
        /^test\w*\d+$/i.test(firstNameLower) ||
        /^load\d+$/i.test(firstNameLower) ||
        /^test\w*\d+$/i.test(lastNameLower) ||
        /^load\d+$/i.test(lastNameLower)
      ) {
        console.log("❌ BLOCKED: Fake name:", first_name, last_name);
        return res.status(400).render("Sigin/sign_up", {
          message: "Invalid name. Please use your real name.",
        });
      }

      // Block fake companies
      if (company && /^comp\d+$/i.test(companyLower)) {
        console.log("❌ BLOCKED: Fake company:", company);
        return res.status(400).render("Sigin/sign_up", {
          message: "Invalid company name.",
        });
      }

      // Check if email already exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.render("Sigin/sign_up", {
          message: "Email already exists. Please choose another one.",
        });
      }

      // Hash the password
      const hashedPassword = await bcrypt.hash(password, 10);
      // Generate OTP
      const otp = Math.floor(100000 + Math.random() * 900000);
      const otpExpiry = Date.now() + 600000; // 10 mins expiry

      // Create new user
      const newUser = new User({
        first_name,
        last_name,
        email,
        phone_number,
        password: hashedPassword,
        company,
        address,
        postcode,
        isVerified: false,   //  new field
      otp: otp.toString(),
      otp_expiry: new Date(otpExpiry),
      });

      await newUser.save();

      // Auto-assign Free Trial plan with limits from database
      const PlanModel = require("../models/plan.model");
      const freeTrialPlanData = await PlanModel.findOne({ plan_name: /^free trial$/i });
      
      if (freeTrialPlanData) {
        // Assign plan name and limits to user
        newUser.plan_name = "Free Trial";
        newUser.planLimits = {
          repairCustomer: parseInt(freeTrialPlanData.repairCustomer) || 0,
          category: parseInt(freeTrialPlanData.category) || 0,
          brand: parseInt(freeTrialPlanData.brand) || 0,
          teams: parseInt(freeTrialPlanData.teams) || 0,
          inStock: parseInt(freeTrialPlanData.inStock) || 0
        };
        await newUser.save();
        console.log(`✅ Plan name and limits assigned to new user:`, newUser.plan_name, newUser.planLimits);
      }

      const trialExpiryDate = new Date();
      trialExpiryDate.setDate(trialExpiryDate.getDate() + 7); // 7 days trial

      const freeTrialPlan = new PlanRequest({
        user: newUser._id,
        planName: "Free Trial",
        status: "Active",
        startDate: new Date(),
        expiryDate: trialExpiryDate,
        invoiceStatus: "Paid",
        amount: 0,
        description: "Free Trial Plan - 7 days access"
      });

      await freeTrialPlan.save();
      console.log(`✅ Free Trial plan assigned to new user: ${newUser.email}`);
      console.log(`📅 Trial expires: ${trialExpiryDate.toLocaleDateString()}`);

      // Create notification for Free Trial plan assignment
      if (req.app.locals.notificationService) {
        try {
          await req.app.locals.notificationService.createNotification(
            newUser._id,
            newUser.first_name,
            "Buy Plan"
          );
          console.log("✅ Free Trial plan assignment notification created");
        } catch (notificationError) {
          console.error("❌ Failed to create Free Trial plan assignment notification:", notificationError.message);
        }
      }

      // Create notification for registration
       if (req.app.locals.notificationService) {
         try {
           await req.app.locals.notificationService.createNotification(
             newUser._id,
             newUser.first_name,
             "Register"
           );
           console.log("✅ Registration notification created");
         } catch (notificationError) {
           console.error("❌ Failed to create registration notification:", notificationError.message);
         }
       }

      // Try to send confirmation email (don't fail signup if email fails)
      console.log("🔍 [DEBUG] About to send confirmation email...");
      console.log("🔍 [DEBUG] Email:", email);
      console.log("🔍 [DEBUG] First name:", first_name);
      console.log("🔍 [DEBUG] Generated OTP:", otp);

      try {
        await sendConfirmationEmail(email, first_name, otp);
        console.log("✅ Confirmation email sent successfully");
      } catch (err) {
        console.error("❌ Failed to send email:", err.message);
        console.error("❌ Error details:", err);
      }

      console.log("✅ User account created successfully, redirecting to sign_in page");
      // Redirect to login page
      return res.redirect('/sign_in?message=Account created successfully! Please check your email for confirmation and login.');

  } catch (error) {
    console.error("Signup error:", error);
    return res.render("Sigin/sign_up", {
      message: "An error occurred while creating your account. Please try again.",
    });
  }
};
exports.verifySignupOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    const user = await User.findOne({
      email,
      otp,
      otp_expiry: { $gt: new Date() }, // not expired
    });

    if (!user) {
      return res.render("Sigin/signup_verify_otp", {
        email,
        message: "Invalid or expired OTP. Please try again.",
      });
    }

    // Mark user as verified
    user.isVerified = true;
    user.otp = null;
    user.otp_expiry = null;
    await user.save();

    return res.render("Sigin/sign_in", {
      message: "Your email has been verified. You can now sign in.",
    });

  } catch (error) {
    console.error("Signup OTP verification error:", error);
    return res.render("Sigin/signup_verify_otp", {
      email: req.body.email,
      message: "An error occurred. Please try again.",
    });
  }
};
// Auto Verify via Link (when clicking the email button)
exports.autoVerifySignup = async (req, res) => {
  try {
    const { email, otp } = req.query;

    const user = await User.findOne({
      email,
      otp,
      otp_expiry: { $gt: new Date() }
    });

    if (!user) {
      return res.render("Sigin/signup_verify_otp", {
        email,
        message: "Invalid or expired OTP. Please try again."
      });
    }

    //  Verify the user
    user.isVerified = true;
    user.otp = null;
    user.otp_expiry = null;
    await user.save();

    return res.render("Sigin/sign_in", {
      message: "Your email has been verified. You can now sign in."
    });
  } catch (err) {
    console.error("Auto verification error:", err);
    return res.render("Sigin/signup_verify_otp", {
      email: req.query.email,
      message: "An error occurred. Please try again."
    });
  }
};

// Signin
exports.signin = async (req, res) => {
    try {
      const { email, password } = req.body;
      console.log('POST /sign_in');
      console.log('Request body:', { email, password });

      // First check User collection
      let user = await User.findOne({ email });
      let isTeamMember = false;
      
      // If not found in User, check AddUser (team members)
      if (!user) {
        const AddUser = require("../models/adduser");
        const teamMember = await AddUser.findOne({ email });
        
        if (teamMember) {
          console.log('Team member found:', teamMember.email);
          isTeamMember = true;
          
          // Check status
          if (teamMember.status !== 'active' && teamMember.status) {
            return res.render("Sigin/sign_in", { message: "Your account has been disabled. Please contact administrator." });
          }
          
          // Check if password exists
          if (!teamMember.password) {
            return res.render("Sigin/sign_in", { message: "Account setup incomplete. Please contact administrator." });
          }
          
          // Hash the password if it's not already hashed (for backward compatibility)
          let isMatch = false;
          if (teamMember.password.startsWith('$2b$')) {
            isMatch = await bcrypt.compare(password, teamMember.password);
          } else {
            isMatch = password === teamMember.password;
          }
          
          if (!isMatch) {
            return res.render("Sigin/sign_in", { message: "Invalid password." });
          }
          
          // Get the parent user account
          user = await User.findById(teamMember.user_id);
          if (!user) {
            return res.render("Sigin/sign_in", { message: "Parent account not found." });
          }
          
          console.log('User ID from session:', user._id);
          req.session.userId = user._id;
          req.session.isTeamMember = true;
          req.session.teamMemberEmail = teamMember.email;
          req.session.teamMemberName = teamMember.name;
          
          const token = jwt.sign({ id: user._id }, "your_jwt_secret", {
            expiresIn: "1h",
          });
          res.cookie("auth_token", token, { httpOnly: true });
          
          return res.redirect("/index");
        }
        
        return res.render("Sigin/sign_in", { message: "Invalid email." });
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.render("Sigin/sign_in", { message: "Invalid password." });
      }

      req.session.userId = user._id;
      // Clear team member flags for regular user login
      req.session.isTeamMember = false;
      req.session.teamMemberEmail = null;
      req.session.teamMemberName = null;
      
      const token = jwt.sign({ id: user._id }, "your_jwt_secret", {
        expiresIn: "1h",
      });

      res.cookie("auth_token", token, { httpOnly: true });

      // Check if user has a plan, if not assign Free Trial
      console.log(`🔍 Checking plan for user: ${user.email} (ID: ${user._id})`);
      const existingPlan = await PlanRequest.findOne({ user: user._id });

      if (!existingPlan) {
        console.log(`🔍 User ${user.email} has no existing plan, assigning Free Trial...`);

        const trialExpiryDate = new Date();
        trialExpiryDate.setDate(trialExpiryDate.getDate() + 7); // 7 days trial

        const freeTrialPlan = new PlanRequest({
          user: user._id,
          planName: "Free Trial",
          status: "Active",
          startDate: new Date(),
          expiryDate: trialExpiryDate,
          invoiceStatus: "Paid",
          amount: 0,
          description: "Free Trial Plan - 7 days access"
        });

        const savedPlan = await freeTrialPlan.save();

        // Fetch Free Trial plan limits from database and assign to user
        const PlanModel = require("../models/plan.model");
        const freeTrialPlanData = await PlanModel.findOne({ plan_name: /^free trial$/i });
        
        if (freeTrialPlanData) {
          user.planLimits = {
            repairCustomer: parseInt(freeTrialPlanData.repairCustomer) || 0,
            category: parseInt(freeTrialPlanData.category) || 0,
            brand: parseInt(freeTrialPlanData.brand) || 0,
            teams: parseInt(freeTrialPlanData.teams) || 0,
            inStock: parseInt(freeTrialPlanData.inStock) || 0
          };
        }
        
        user.plan_name = "Free Trial";
        user.plan_limit = 30;
        await user.save();

        console.log(`✅ Free Trial plan assigned to NEW user: ${user.email}`);
        console.log(`✅ Plan limits assigned:`, user.planLimits);
        console.log(`📅 Trial expires: ${trialExpiryDate.toLocaleDateString()}`);
        console.log(`💾 Plan saved with ID: ${savedPlan._id}`);

        // Create notification for Free Trial plan assignment
        if (req.app.locals.notificationService) {
          try {
            await req.app.locals.notificationService.createNotification(
              user._id,
              user.first_name,
              "Buy Plan"
            );
            console.log("✅ Free Trial plan assignment notification created for new user");
          } catch (notificationError) {
            console.error("❌ Failed to create Free Trial plan assignment notification:", notificationError.message);
          }
        }
      } else {
        console.log(`✅ User ${user.email} already has a plan: ${existingPlan.planName} (Status: ${existingPlan.status})`);

        // Check if existing plan is expired, cancelled, or needs renewal
        const now = new Date();
        const shouldRenewPlan =
          existingPlan.status === 'Expired' ||
          existingPlan.status === 'Cancelled' ||
          (existingPlan.expiryDate && now > existingPlan.expiryDate);

        if (shouldRenewPlan) {
          console.log(`🔄 Existing plan needs renewal (${existingPlan.status}), renewing Free Trial for user: ${user.email}`);
          const trialExpiryDate = new Date();
          trialExpiryDate.setDate(trialExpiryDate.getDate() + 7);

          existingPlan.status = 'Active';
          existingPlan.expiryDate = trialExpiryDate;
          existingPlan.description = 'Free Trial Plan - Renewed';
          await existingPlan.save();

          // Fetch Free Trial plan limits and assign to user
          const PlanModel = require("../models/plan.model");
          const freeTrialPlanData = await PlanModel.findOne({ plan_name: /^free trial$/i });
          
          if (freeTrialPlanData) {
            user.planLimits = {
              repairCustomer: parseInt(freeTrialPlanData.repairCustomer) || 0,
              category: parseInt(freeTrialPlanData.category) || 0,
              brand: parseInt(freeTrialPlanData.brand) || 0,
              teams: parseInt(freeTrialPlanData.teams) || 0,
              inStock: parseInt(freeTrialPlanData.inStock) || 0
            };
          }
          
          user.plan_name = "Free Trial";
          user.plan_limit = 30;
          await user.save();

          console.log(`✅ Plan renewed for user: ${user.email}`);
          console.log(`✅ Plan limits assigned:`, user.planLimits);

          // Create notification for Free Trial plan renewal
          if (req.app.locals.notificationService) {
            try {
              await req.app.locals.notificationService.createNotification(
                user._id,
                user.first_name,
                "Buy Plan"
              );
              console.log("✅ Free Trial plan renewal notification created");
            } catch (notificationError) {
              console.error("❌ Failed to create Free Trial plan renewal notification:", notificationError.message);
            }
          }
        }
      }

      // Create notification for login
      if (req.app.locals.notificationService) {
        console.log(`Calling notification service for login: ${user.first_name}`);
        await req.app.locals.notificationService.createNotification(
          user._id,
          user.first_name,
          "Login"
        );

        // Check for free trial notifications
        if (existingPlan && existingPlan.planName === "Free Trial" && existingPlan.status === "Active") {
          const now = new Date();
          const trialEndDate = new Date(existingPlan.expiryDate);
          const daysLeft = Math.ceil((trialEndDate - now) / (1000 * 60 * 60 * 24));

          if (daysLeft > 0) {
            await req.app.locals.notificationService.createNotification(
              user._id,
              user.first_name,
              "Buy Plan"
            );
          } else {
            await req.app.locals.notificationService.createNotification(
              user._id,
              user.first_name,
              "Buy Plan"
            );
          }
        }
      } else {
        console.log('Notification service not available');
      }

      return res.redirect("/index");
    } catch (error) {
      console.error("Login error:", error);
      return res.render("Sigin/sign_in", {
        message: "An error occurred during login. Please try again."
      });
    }
};

// forget password // forget password
// Forgot Password - Send OTP
  exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    // Check if email exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.render("Sigin/sign_in", {
        message: "Email not found. Please enter a valid email.",
      });
    }

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000);
    const otpExpiry = Date.now() + 600000; // 10 mins

    // Save OTP + expiry
    user.otp = otp.toString();
    user.otp_expiry = new Date(otpExpiry);
    await user.save();

    console.log("Forgot password OTP generated for:", email);

    // Send OTP email (with reset link)
    console.log("🔍 [DEBUG] About to send forgot password email...");
    console.log("🔍 [DEBUG] Email:", email);
    console.log("🔍 [DEBUG] User name:", user.first_name || "User");
    console.log("🔍 [DEBUG] Generated OTP:", otp);

    try {
      await sendForgotPasswordEmail(email, user.first_name || "User", otp);
      console.log("✅ Forgot password OTP sent successfully to:", email);
    } catch (mailError) {
      console.error("❌ Failed to send forgot password OTP:", mailError.message);
      console.error("❌ Error details:", mailError);
    }

    // Redirect to pre-filled OTP form
    return res.redirect(`/forgot-password?email=${email}&otp=${otp}`);
  } catch (error) {
    console.error("Forgot password error:", error);
    return res.render("Sigin/sign_in", {
      message: "An error occurred. Please try again.",
    });
  }
};
exports.renderResetPasswordForm = async (req, res) => {
  try {
    const { email, otp } = req.query;

    // Check if user exists and OTP is valid
    const user = await User.findOne({
      email,
      otp,
      otp_expiry: { $gt: new Date() },
    });

    if (!user) {
      return res.render("Sigin/signup_verify_otp", {
        email,
        message: "Invalid or expired OTP. Please request a new one.",
      });
    }

    // Render reset password form with hidden OTP + email
    return res.render("Sigin/reset_password", {
      email,
      otp, // send OTP to form
      message: "Enter your new password below.",
    });
  } catch (error) {
    console.error("Error rendering reset password form:", error);
    return res.render("Sigin/signup_verify_otp", {
      email: req.query.email,
      message: "An error occurred. Please try again.",
    });
  }
};
exports.verifyOtpAndResetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    // Validate OTP
    const user = await User.findOne({
      email,
      otp,
      otp_expiry: { $gt: new Date() },
    });

    if (!user) {
      return res.render("Sigin/sign_in", {
        email,
        message: "Invalid or expired OTP. Please try again.",
      });
    }

    // If OTP is correct but no newPassword yet → show reset form
    if (!newPassword) {
      return res.render("Sigin/reset_password", {
        email,
        otp,
        message: "Enter your new password below.",
      });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Save new password + clear OTP
    user.password = hashedPassword;
    user.otp = null;
    user.otp_expiry = null;
    await user.save();

    return res.render("Sigin/sign_in", {
      message: "Password reset successfully. Please log in.",
    });
  } catch (error) {
    console.error("Error resetting password:", error);
    return res.render("Sigin/signup_verify_otp", {
      email: req.body.email,
      message: "An error occurred. Please try again.",
    });
  }
};

// forget password // forget password

// Logout
 exports.logout = async (req, res) => {
   console.log("Logout route hit:", req.method, req.url);
   console.log("Request body:", req.body);
 
   try {
     const reason = req.body.reason; // now required
     const sessionUserId = req.session.userId;
     const user = sessionUserId ? await User.findById(sessionUserId) : null;
 
     if (!user) {
       return res.render("Sigin/sign_in", {
         message: "Cannot determine user email. Logout cancelled.",
       });
     }
 
     const email = user.email;
     const name = user.first_name || "User";
 
     req.session.destroy(async (err) => {
       if (err) {
         console.error("Error destroying session:", err);
         return res.redirect("/index");
       }
 
       res.clearCookie("connect.sid");
       res.clearCookie("auth_token");
        // Create notification for logout
     const userId = sessionUserId;
     const userName = name;
     if (req.app.locals.notificationService && userId) {
       await req.app.locals.notificationService.createNotification(
         userId,
         userName,
         "Logout"
       );}
 
       // Send logout email
       console.log("🔍 [DEBUG] About to send logout email...");
       console.log("🔍 [DEBUG] Email:", email);
       console.log("🔍 [DEBUG] Name:", name);
       console.log("🔍 [DEBUG] Reason:", reason);

       try {
         await sendLogoutEmail(email, name, reason);
         console.log("✅ Logout email sent successfully");
       } catch (logoutError) {
         console.error("❌ Failed to send logout email:", logoutError.message);
         console.error("❌ Error details:", logoutError);
       }
 
       console.log(`User logged out. Reason: ${reason}`);
 
       return res.render("Sigin/sign_in", {
         message: "You have been logged out successfully.",
       });
     });
   } catch (error) {
     console.error("Logout error:", error);
     return res.render("Sigin/sign_in", {
       message: "An error occurred during logout.",
     });
   }
 };
 
