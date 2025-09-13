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

// Initialize Express app
const app = express();


// Create HTTP server and integrate Socket.IO
const server = http.createServer(app);
const io = socketIo(server);

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

// Debug middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// Routes
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
app.use("/", TeamsRoutes);

// 404 Middleware
app.use((req, res) => {
  return res.status(404).render("404");
});

// Start the server
const PORT = process.env.Port || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
