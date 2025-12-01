const express = require("express");
const dotenv = require("dotenv");
dotenv.config();
const bodyParser = require("body-parser");
const session = require("express-session");
const flash = require("connect-flash");
const path = require("path");
const http = require("http");
const socketIo = require("socket.io");
const methodOverride = require("method-override");

const cookieParser = require("cookie-parser");

// Database connection
const { connectDB } = require("./src/config/db");

// Import routes
const authRoutes = require("./src/routes/authRoutes");
const productRoutes = require("./src/routes/repairRoutes");
const categoryRoutes = require("./src/routes/categoryRoutes");
const BrandRoutes = require("./src/routes/BrandRoutes");
const AllBrandRoutes = require("./src/routes/AllBrandRoutes");
const AllCategoriesRoutes = require("./src/routes/AllCategoriesRoutes");
const settingRoutes = require("./src/routes/settingRouter");
const HelpRoutes = require("./src/routes/helpRoutes");
const itemsRoutes = require("./src/routes/in_stockRoutes");
const adminRoutes = require("./src/routes/adminRoutes");
const profileRoutes = require("./src/routes/profileRoutes");
const inventoryRoutes = require("./src/routes/inventoryRoutes");
const indexRoutes = require("./src/routes/indexRoutes");
const pricingRoutes = require("./src/routes/pricingRoutes");
const SellRoutes = require("./src/routes/sellRoutes");
const AdminTeamsRoutes = require("./src/routes/AdminTeamsRoutes");
const UserTeamsRoutes = require("./src/routes/UserTeamsRoutes");

const planRequestRoutes = require("./src/routes/adminRequestroute");
const requestRoutes = require("./src/routes/requestRoutes");

const notificationRoutes = require("./src/routes/notificationRoutes");
const walletRoutes = require("./src/routes/walletRoutes");
const ticketRoutes = require("./src/routes/ticketRoutes");
const trackingRoutes = require("./src/routes/trackingRoutes");

// Import new MongoDB-based routes
const quranRoutes = require("./src/routes/quranRoutes");
const prayerRoutes = require("./src/routes/prayerRoutes");
const tasbeehRoutes = require("./src/routes/tasbeehRoutes");
const weatherRoutes = require("./src/routes/weatherRoutes");
const contactusRoutes = require("./src/routes/contactusRoutes");
const ComplaintRoutes = require("./src/routes/ComplaintRoutes");
const reviewRoutes = require("./src/routes/reviewRoutes");
const infoModel = require("./src/models/info");
const planRoutes = require("./src/routes/planRoutes");

// Initialize Express app
const app = express();


// Create HTTP server and integrate Socket.IO
const server = http.createServer(app);
const io = socketIo(server);

// Initialize notification service
const NotificationService = require("./notificationService");
const notificationService = new NotificationService(io);

// Make notification service available globally
app.locals.notificationService = notificationService;

// Socket.IO connection handling
io.on("connection", (socket) => {
  console.log("Socket.IO: User connected:", socket.id);
  
  socket.on("markNotificationsRead", async () => {
    console.log("Socket.IO: Mark notifications as read request");
    await notificationService.markAsRead();
  });
  
  socket.on("disconnect", () => {
    console.log("Socket.IO: User disconnected:", socket.id);
  });
});

console.log("Socket.IO server initialized");

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(methodOverride('_method')); // Enable DELETE/PUT via POST with ?_method=DELETE
app.use(express.static(path.join(__dirname, "public")));
app.use("/uploads", express.static("uploads"));
app.use(cookieParser());

// Session and Flash Messages
app.use(
  session({
    secret: "your-secret-key",
    resave: false,
    saveUninitialized: true,
  })
);
app.use(flash());
//
app.use((req, res, next) => {
  res.setHeader(
    "Cache-Control",
    "no-store, no-cache, must-revalidate, proxy-revalidate"
  );
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  next();
});

// Set up view engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "view"));

// Global middleware to set user role variables for all EJS templates
app.use(async (req, res, next) => {
  if (req.session.userId) {
    try {
      const User = require("./src/models/user");
      const user = await User.findById(req.session.userId).select("role");
      if (user) {
        res.locals.isAdmin = user.role === "admin";
        res.locals.isUser = user.role === "user";
      } else {
        res.locals.isAdmin = false;
        res.locals.isUser = false;
      }
    } catch (error) {
      console.error("Error fetching user role:", error.message);
      res.locals.isAdmin = false;
      res.locals.isUser = false;
    }
  } else {
    res.locals.isAdmin = false;
    res.locals.isUser = false;
  }
  next();
});

// Add notification data middleware
const { addNotificationData } = require("./src/middlewares/notificationMiddleware");
app.use(addNotificationData);

// Currency detection middleware (LinkedIn-style) - AFTER session
try {
  const { detectCurrency, currencyLocals } = require("./src/middlewares/currencyMiddleware");
  app.use(detectCurrency);
  app.use(currencyLocals);
  console.log('✅ Currency detection enabled');
} catch (err) {
  console.log('⚠️ Currency detection disabled (run: npm install)');
}

// Debug middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  if (req.body && Object.keys(req.body).length > 0) {
    console.log('Request body:', req.body);
  }
  if (req.session && req.session.userId) {
    console.log('User ID from session:', req.session.userId);
  }
  next();
});





// Pass information service to routes
app.use(async (req, res, next) => {
  try {
    const setting = await infoModel.findOne();
    res.locals.info = setting || {};
    res.locals.description = setting ? setting.description : "";
    res.locals.title = setting ? setting.title : "";
    res.locals.favicon = setting ? setting.favicon : "";
    res.locals.footer = setting ? setting.footer_text : "";
    res.locals.navbar_color = setting ? setting.navbar_color : "";
    res.locals.welcome_description = setting ? setting.welcome_description : "";
  } catch (err) {
    res.locals.info = {};
    res.locals.description = "";
    res.locals.title = "";
    res.locals.favicon = "";
    res.locals.footer = "";
    res.locals.navbar_color = "";
    res.locals.welcome_description = "";
  }
  next();
});



// Routes
app.use("/", notificationRoutes);
app.use("/", authRoutes);
app.use("/", productRoutes);
app.use("/", categoryRoutes);
app.use("/", BrandRoutes);
app.use("/", AllBrandRoutes);
app.use("/", AllCategoriesRoutes);
app.use("/", settingRoutes);
app.use("/", HelpRoutes);
app.use("/", itemsRoutes);
app.use("/", adminRoutes);
app.use("/", profileRoutes);
app.use("/", inventoryRoutes);
app.use("/", indexRoutes);
app.use("/", pricingRoutes);
app.use("/", SellRoutes);
app.use("/", requestRoutes);
app.use("/", planRequestRoutes);
app.use("/", walletRoutes);
app.use("/", ticketRoutes);
app.use("/", planRoutes);

// Add new MongoDB-based routes
app.use("/", quranRoutes);
app.use("/", prayerRoutes);
app.use("/", tasbeehRoutes);
app.use("/", weatherRoutes);
app.use("/", contactusRoutes);
app.use("/", ComplaintRoutes);
app.use("/", reviewRoutes);
app.use("/", trackingRoutes);

// Add User Teams routes directly (moved before AdminTeamsRoutes)
app.use("/", UserTeamsRoutes);

// Add Admin Teams routes directly
app.use("/", AdminTeamsRoutes);

// Delete Selected Route - Reusable for all tables
app.post('/delete-selected/:table', async (req, res) => {
  const { selectedIds } = req.body;
  const { table } = req.params;

  try {
    // Map the table name to its corresponding model
    const models = {
      repair: require("./src/models/repair"),
      users: require("./src/models/user"),
      clients: require("./src/models/user"),
      tickets: require("./src/models/ticket"),
      wallet: require("./src/models/wallet"),
      plans: require("./src/models/plan.model"),
      planrequests: require("./src/models/planRequest"),
      complaints: require("./src/models/complaint"),
      inventory: require("./src/models/inventery"),
      soldproducts: require("./src/models/Sold_Products"),
      notifications: require("./src/models/notification"),
      transactions: require("./src/models/transaction"),
      payments: require("./src/models/payments"),
      categories: require("./src/models/categories"),
      brands: require("./src/models/brand"),
      help: require("./src/models/help"),
      contactus: require("./src/models/contactus"),
      teams: require("./src/models/adduser"),
      adminteams: require("./src/models/adduser"),
      userteams: require("./src/models/adduser"),
    };

    const Model = models[table];
    if (!Model) {
      return res.status(400).json({
        success: false,
        message: `Invalid table name: ${table}. Available tables: ${Object.keys(models).join(', ')}`
      });
    }

    // Validate selectedIds
    if (!selectedIds || !Array.isArray(selectedIds) || selectedIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No items selected for deletion'
      });
    }

    const result = await Model.deleteMany({ _id: { $in: selectedIds } });

    res.json({
      success: true,
      message: `${result.deletedCount} record(s) deleted successfully from ${table}`,
      deletedCount: result.deletedCount
    });

  } catch (err) {
    console.error('Delete selected error:', err);
    res.status(500).json({
      success: false,
      message: 'Error deleting records',
      error: err.message
    });
  }
});

// 404 Middleware with logging
app.use((req, res) => {
  console.log('404 - Route not found:', req.method, req.url);
  return res.status(404).json({ error: 'Route not found', method: req.method, url: req.url });
});

// Start the server
const PORT = process.env.PORT || 3000;

connectDB().then(() => {
  server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });

  // Basic recurring billing check - run every 24 hours
  setInterval(async () => {
    try {
      const User = require('./src/models/user');
      const Wallet = require('./src/models/wallet');
      const Transaction = require('./src/models/transaction');
      const Payments = require('./src/models/payments');

      const planPrices = {
        BASIC: 20.88,
        STANDARD: 35.88,
        PREMIUM: 55.88,
      };

      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const expiringPayments = await Payments.find({
        status: 'active',
        expiryDate: { $lt: tomorrow }
      }).populate('user');

      for (const payment of expiringPayments) {
        const user = payment.user;
        if (user.plan_name === 'FREE_TRIAL') continue;

        const wallet = await Wallet.findOne({ user: user._id });
        if (!wallet || wallet.balance < planPrices[user.plan_name]) continue;

        // Deduct from balance
        wallet.balance -= planPrices[user.plan_name];
        await wallet.save();

        // Create new payment record
        const newExpiry = new Date(today);
        newExpiry.setDate(newExpiry.getDate() + 30);
        const newPayment = new Payments({
          user: user._id,
          plan: user.plan_name,
          amount: planPrices[user.plan_name],
          gateway: 'wallet',
          startDate: today,
          expiryDate: newExpiry,
          status: 'active'
        });
        await newPayment.save();

        // Create transaction
        const newTransaction = new Transaction({
          user: user._id,
          type: 'payment',
          amount: planPrices[user.plan_name],
          status: 'success'
        });
        await newTransaction.save();

        // Update plan limits - add to current
        const currentUser = await User.findById(user._id).select('plan_limit');
        let planLimit;
        switch (user.plan_name) {
          case 'BASIC': planLimit = 300; break;
          case 'STANDARD': planLimit = 500; break;
          case 'PREMIUM': planLimit = 1000; break;
          default: planLimit = 30;
        }
        const newLimit = (currentUser.plan_limit || 0) + planLimit;
        await User.findByIdAndUpdate(user._id, { plan_limit: newLimit });

        console.log(`Auto-renewed plan for user ${user._id}`);
      }
    } catch (error) {
      console.error('Recurring billing error:', error.message);
    }
  }, 24 * 60 * 60 * 1000); // 24 hours
});
