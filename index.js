const express = require("express");
const dotenv = require("dotenv");
dotenv.config();
const bodyParser = require("body-parser");
const session = require("express-session");
const flash = require("connect-flash");
const path = require("path");
const http = require("http");
const socketIo = require("socket.io");

const cookieParser = require("cookie-parser");

// Database connection
const { connectDB } = require("./src/config/db");

// Import routes
const authRoutes = require("./src/routes/authRoutes");
const productRoutes = require("./src/routes/repairRoutes");
const categoryRoutes = require("./src/routes/categoryRoutes");
const BrandRoutes = require("./src/routes/BrandRoutes");
const settingRoutes = require("./src/routes/settingRouter");
const HelpRoutes = require("./src/routes/helpRoutes");
const itemsRoutes = require("./src/routes/in_stockRoutes");
const adminRoutes = require("./src/routes/adminRoutes");
const profileRoutes = require("./src/routes/profileRoutes");
const inventoryRoutes = require("./src/routes/inventoryRoutes");
const indexRoutes = require("./src/routes/indexRoutes");
const pricingRoutes = require("./src/routes/pricingRoutes");
const SellRoutes = require("./src/routes/sellRoutes");
const TeamsRoutes = require("./src/routes/TeamsRoutes");
const requestRoutes = require("./src/routes/requestRoutes");
const notificationRoutes = require("./src/routes/notificationRoutes");

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

// Routes
app.use("/", notificationRoutes);
app.use("/", authRoutes);
app.use("/", productRoutes);
app.use("/", categoryRoutes);
app.use("/", BrandRoutes);
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
// Add Teams routes with explicit logging
app.use("/", (req, res, next) => {
  if (req.url.includes('team')) {
    console.log('Teams route intercepted:', req.method, req.url);
  }
  next();
}, TeamsRoutes);

// 404 Middleware with logging
app.use((req, res) => {
  console.log('404 - Route not found:', req.method, req.url);
  return res.status(404).json({ error: 'Route not found', method: req.method, url: req.url });
});

// Start the server
const PORT = process.env.Port || 3000;
connectDB().then(() => {
  server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
});
