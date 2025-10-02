const User = require("../models/user");
const Repair = require("../models/repair");
const Category = require("../models/categories");
const Brand = require("../models/brand");

exports.addProduct = async (req, res) => {
  try {
    if (!req.session.userId) {
      console.error("User not logged in or session expired");
      return res.redirect("/sign_in");
    }

    const {
      fullName,
      mobileNumber,
      brand,
      email,
      device,
      status,
      gadgetProblem,
      Price,
      random_id,
    } = req.body;

    // Safeguards for missing data
    const defaultEmail = "hYd2e@example.com";
    const userEmail = email || defaultEmail;
    const deviceImage = req.file ? `/uploads/${req.file.filename}` : "/uploads/1737205923556.jpg";
    const price = Price && !isNaN(Price) ? parseFloat(Price) : 0;
    const randomId = random_id || "0000";

    // Fetch user profile
    const user = await User.findById(req.session.userId).select(
      "plan_name subscription_date plan_limit"
    );

    if (!user) {
      req.flash("error_msg", "User not found.");
      return res.redirect("/repair");
    }

    if (!user.subscription_date) {
      req.flash("error_msg", "Registration date not available.");
      return res.redirect("/repair");
    }

    // Check subscription expiry
    const currentDate = new Date();
    const subscriptionDate = new Date(user.subscription_date);
    const expirationDate = new Date(subscriptionDate);
    expirationDate.setDate(expirationDate.getDate() + 30);

    if (currentDate > expirationDate) {
      req.flash("error_msg", "Your 30-day subscription period has expired. Please renew your subscription.");
      return res.redirect("/pricing");
    }

    // Check stock limit
    const currentStock = await Repair.countDocuments({ user_id: req.session.userId });
    const stockLimit = user.plan_limit || 0;

    if (currentStock >= stockLimit) {
      req.flash("error_msg", "You have reached your stock limit. Please upgrade your plan.");
      return res.redirect("/repair");
    }

    // Create new repair
    const newRepair = new Repair({
      fullName: fullName || "Unknown",
      mobileNumber: mobileNumber || "0000000000",
      brand: brand || "Unknown",
      email: userEmail,
      device: device || "Unknown Device",
      deviceImage,
      status: status || "Pending",
      gadgetProblem: gadgetProblem || "Repair",
      user_id: req.session.userId,
      random_id: randomId,
      Price: price
    });

    await newRepair.save();



        const trackingId = newRepair._id.toString();

    // Send email with tracking id (Gmail via nodemailer)
    try {
      const nodemailer = require("nodemailer");

      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: process.env.EMAIL_USER, // set in env
          pass: process.env.EMAIL_PASS, // app password recommended
        },
      });

      const mailOptions = {
        from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
        to: userEmail,
        subject: `Repair Registered — Tracking ID ${trackingId}`,
        html: `
<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width">
  <title>Repair Registered</title>
  <style>
    /* Light, email-safe inline styles kept minimal for portability */
    body { margin:0; padding:0; background:#f4f6f8; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial; }
    .wrapper { width:100%; padding:24px 0; }
    .container { max-width:680px; margin:0 auto; background:#ffffff; border-radius:12px; overflow:hidden; box-shadow: 0 6px 30px rgba(2,6,23,0.12); }
    .header { padding:28px 36px; background: linear-gradient(90deg,#0f172a,#0b1220); color:#fff; display:flex; align-items:center; gap:16px; }
    .logo { width:56px; height:56px; border-radius:10px; background:rgba(255,255,255,0.06); display:inline-flex; align-items:center; justify-content:center; font-weight:700; font-size:18px; color:#fff; }
    .title { font-size:20px; font-weight:700; margin:0; }
    .body { padding:28px 36px; color:#0b1220; }
    .greeting { font-size:16px; margin:0 0 12px 0; color:#0b1220; }
    .card { background:#f8fafc; border:1px solid #e6eef4; padding:16px; border-radius:10px; margin:14px 0; }
    .muted { color:#6b7280; font-size:14px; }
    .row { display:flex; justify-content:space-between; align-items:center; margin:8px 0; }
    .label { color:#6b7280; font-size:13px; }
    .value { font-weight:600; color:#0b1220; }
    .tracking { font-family: monospace; background:#0b1220; color:#fff; padding:8px 12px; border-radius:8px; display:inline-block; }
    .cta { display:block; text-decoration:none; text-align:center; margin:22px auto 8px; padding:12px 20px; border-radius:10px; background:linear-gradient(90deg,#ef4444,#fb923c); color:#fff; font-weight:700; width:fit-content; }
    .steps { margin-top:12px; }
    .step { margin:10px 0; display:flex; gap:12px; align-items:flex-start; }
    .dot { width:10px; height:10px; border-radius:50%; background:#0b1220; margin-top:6px; }
    .footer { padding:20px 36px; font-size:13px; color:#6b7280; border-top:1px solid #eef2f7; background:#fbfdff; }
    @media (max-width:480px){ .header{padding:18px}; .body{padding:18px}; .container{margin:0 12px} }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container" role="article" aria-roledescription="email">
      <div class="header">
        <div class="logo">DIB</div>
        <div>
          <p class="title">Repair Request Registered</p>
          <p class="muted" style="margin:4px 0 0 0;">We’ve logged your device and started the repair process.</p>
        </div>
      </div>

      <div class="body">
        <p class="greeting">Hi ${fullName || "Customer"},</p>

        <p class="muted">Thanks — your repair request is in our system. Below are the details and the tracking ID you can use to check status anytime.</p>

        <div class="card" role="group" aria-label="Repair summary">
          <div class="row">
            <div class="label">Tracking ID</div>
            <div class="tracking">${trackingId}</div>
          </div>

          <div class="row">
            <div class="label">Device</div>
            <div class="value">${device || "N/A"}</div>
          </div>

          <div class="row">
            <div class="label">Reported issue</div>
            <div class="value">${gadgetProblem || "N/A"}</div>
          </div>

          <div class="row">
            <div class="label">Estimated cost</div>
            <div class="value">$${typeof price === "number" ? price.toFixed(2) : price || "0.00"}</div>
          </div>
        </div>

        <a class="cta" href="${process.env.APP_URL || 'https://yourapp.com'}/track?trackingId=${trackingId}" target="_blank" rel="noopener">Track your repair</a>

        <div class="steps">
          <div class="step">
            <div class="dot" style="background:#60a5fa"></div>
            <div>
              <div style="font-weight:700">We inspect</div>
              <div class="muted">Our technician inspects your device and provides a diagnostic.</div>
            </div>
          </div>

          <div class="step">
            <div class="dot" style="background:#fbbf24"></div>
            <div>
              <div style="font-weight:700">We repair</div>
              <div class="muted">Parts replaced or repaired. We keep you updated during the process.</div>
            </div>
          </div>

          <div class="step">
            <div class="dot" style="background:#34d399"></div>
            <div>
              <div style="font-weight:700">We deliver</div>
              <div class="muted">Once complete, we’ll notify you and mark the repair as delivered.</div>
            </div>
          </div>
        </div>

        <p class="muted" style="margin-top:18px;">If you have questions, reply to this email or contact support at <a href="mailto:support@yourapp.com">support@yourapp.com</a>. Keep your tracking ID handy for faster help.</p>

        <p style="margin-top:18px;">Thanks for trusting us — we’ll take good care of your device.</p>

        <p style="margin-top:18px; font-weight:700">— The DIB Team</p>
      </div>

      <div class="footer">
        <div>Need to change anything? Visit <a href="${process.env.APP_URL || 'https://yourapp.com'}" target="_blank" style="color:#0b1220; text-decoration:none;">your dashboard</a> and update the request.</div>
        <div style="margin-top:8px;">This is an automated message — do not share the tracking id publicly.</div>
      </div>
    </div>
  </div>
</body>
</html>
`,

      };

      await transporter.sendMail(mailOptions);
      console.log("Tracking email sent to:", userEmail, " TrackingId:", trackingId);
    } catch (emailErr) {
      console.error("Failed to send tracking email:", emailErr);
      // don't block user flow if email fails
    }




    
    // Create notification for adding repair customer
    if (req.app.locals.notificationService) {
      const user = await User.findById(req.session.userId).select('first_name');
      if (user) {
        await req.app.locals.notificationService.createNotification(
          req.session.userId,
          user.first_name,
          "Add Repair Customer"
        );
      }
    }
    
    req.flash("success_msg", "Repair product added successfully");
    res.redirect("/repair");
  } catch (error) {
    console.error("Error adding repair product:", error.message);
    req.flash("error_msg", "Failed to add repair product. Please try again.");
    res.redirect("/repair");
  }
};

exports.getRepairProducts = async (req, res) => {
  try {
    const userId = req.session.userId;
    if (!userId) {
      console.error("User is not logged in.");
      return res.redirect("/sign_in");
    }

    // Fetch all data concurrently
    const [user, categories, brands, repairProducts] = await Promise.all([
      User.findById(userId).select(
        "first_name last_name phone_number email company address user_img plan_name status denial_reason role"
      ),
      Category.find({ user_id: userId }),
      Brand.find({ user_id: userId }),
      Repair.find({ user_id: userId }).sort({ _id: -1 })
    ]);

    if (!user) {
      return res.redirect("/sign_in");
    }

    res.render("repair/repair", {
      profileImagePath: user.user_img || "/uploads/default.png",
      firstName: user.first_name,
      lastName: user.last_name,
      company: user.company,
      categories: categories,
      brand: brands,
      products: repairProducts,
      plan_name: user.plan_name || "No Plan",
      success_msg: req.flash("success_msg"),
      error_msg: req.flash("error_msg"),
      status: user.status,
      reson: user.denial_reason,
    });
  } catch (error) {
    console.error("Error fetching repair products:", error.message);
    return res.render("repair/repair", {
      products: [],
      categories: [],
      brand: [],
      error_msg: "Unable to load repair products. Please try again.",
      success_msg: ""
    });
  }
};

exports.deleteProduct = async (req, res) => {
  try {
    const clientId = req.params.id;
    await Repair.findByIdAndDelete(clientId);
    req.flash("success_msg", "Client deleted successfully");
    res.redirect("/repair");
  } catch (error) {
    console.error("Error deleting repair product:", error.message);
    req.flash("error_msg", "Failed to delete client. Please try again.");
    res.redirect("/repair");
  }
};

exports.deleteProducts = async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: "No clients selected for deletion" });
    }

    await Repair.deleteMany({ _id: { $in: ids } });
    req.flash("success_msg", "Clients deleted successfully");
    res.redirect("/repair");
  } catch (error) {
    console.error("Error deleting repair products:", error.message);
    req.flash("error_msg", "Failed to delete clients. Please try again.");
    res.redirect("/repair");
  }
};

exports.updateProduct = async (req, res) => {
  try {
    const productId = req.params.id;
    const { status } = req.body;
    
    await Repair.findByIdAndUpdate(productId, { status });
    
    // Create notification for changing repair status
    if (req.app.locals.notificationService) {
      const user = await User.findById(req.session.userId).select('first_name');
      if (user) {
        await req.app.locals.notificationService.createNotification(
          req.session.userId,
          user.first_name,
          "Change Repair Status"
        );
      }
    }
    
    req.flash("success_msg", "Status updated successfully");
    res.redirect("/repair");
  } catch (error) {
    console.error("Error updating repair product:", error.message);
    req.flash("error_msg", "Failed to update status. Please try again.");
    res.redirect("/repair");
  }
};

exports.getRepairPrices = async (req, res) => {
  try {
    const userId = req.session.userId;
    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }

    const repairs = await Repair.find({ user_id: userId }).select("Price");
    const prices = repairs.map((repair) => repair.Price);
    res.json(prices);
  } catch (error) {
    console.error("Error fetching repair prices:", error.message);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

exports.getClients = async (req, res) => {
  try {
    const userId = req.session.userId;
    if (!userId) {
      console.error("User is not logged in.");
      return res.redirect("/sign_in");
    }

    // Fetch all data concurrently
    const [user, categories, brands, repairProducts] = await Promise.all([
      User.findById(userId).select(
        "first_name last_name phone_number email company address user_img plan_name status denial_reason role"
      ),
      Category.find({ user_id: userId }),
      Brand.find({ user_id: userId }),
      Repair.find({ user_id: userId }).sort({ _id: -1 })
    ]);

    if (!user) {
      return res.redirect("/sign_in");
    }

    res.render("Clients/Clients", {
      profileImagePath: user.user_img || "/uploads/default.png",
      firstName: user.first_name,
      lastName: user.last_name,
      company: user.company,
      categories: categories,
      brand: brands,
      products: repairProducts,
      plan_name: user.plan_name || "No Plan",
      success_msg: req.flash("success_msg"),
      error_msg: req.flash("error_msg"),
      status: user.status,
      reson: user.denial_reason,
    });
  } catch (error) {
    console.error("Error fetching clients:", error.message);
    return res.render("Clients/Clients", {
      products: [],
      categories: [],
      brand: [],
      error_msg: "Unable to load clients. Please try again.",
      success_msg: ""
    });
  }
};

exports.updateClients = async (req, res) => {
  try {
    const client = req.params.id;
    const {
      fullName,
      mobileNumber,
      brand,
      email,
      device,
      status,
      gadgetProblem,
    } = req.body;

    await Repair.findByIdAndUpdate(client, {
      fullName,
      mobileNumber,
      brand,
      email,
      device,
      status,
      gadgetProblem
    });

    req.flash("success_msg", "Client updated successfully");
    res.redirect("/Clients");
  } catch (error) {
    console.error("Error updating client:", error.message);
    req.flash("error_msg", "Failed to update client. Please try again.");
    res.redirect("/Clients");
  }
};

exports.deleteClients = async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: "No clients selected for deletion" });
    }

    await Repair.deleteMany({ _id: { $in: ids } });
    req.flash("success_msg", "Clients deleted successfully");
    res.redirect("/Clients");
  } catch (error) {
    console.error("Error deleting clients:", error.message);
    req.flash("error_msg", "Failed to delete clients. Please try again.");
    res.redirect("/Clients");
  }
};

exports.deleteClient = async (req, res) => {
  try {
    const clientId = req.params.id;
    await Repair.findByIdAndDelete(clientId);
    req.flash("success_msg", "Client deleted successfully");
    res.redirect("/Clients");
  } catch (error) {
    console.error("Error deleting client:", error.message);
    req.flash("error_msg", "Failed to delete client. Please try again.");
    res.redirect("/Clients");
  }
};

exports.done = async (req, res) => {
  try {
    const repairs = await Repair.find();
    res.render("your-ejs-file", { repairs: repairs });
  } catch (error) {
    console.error("Database error:", error.message);
    return res.status(500).send("Database error");
  }
};