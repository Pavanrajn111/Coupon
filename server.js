require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const path = require("path");
const bcrypt = require("bcryptjs");
const authRoutes = require("./src/routes/authRoutes");
const detailsDb = require("./src/db/detailsDb");
const getAvailablePort = require("./src/utils/port");

const app = express();
const PORT = process.env.PORT || 8000;

// Initialize SQLite details.db on startup
const sqliteDb = detailsDb.initDetailsDb();

const createDemoUser = async () => {
  try {
    // Check if demo user already exists in SQLite
    const existingDemo = detailsDb.findUserByUsernameOrEmail("demo");
    if (existingDemo) {
      console.log("Demo account ready: demo / Demo@1234");
      return;
    }

    const hashedPassword = await bcrypt.hash("Demo@1234", 10);
    detailsDb.createUser({
      fullName: "CouponEx Demo",
      username: "demo",
      email: "demo@couponex.com",
      phoneNumber: "9999999999",
      password: hashedPassword,
    });

    console.log("Demo account ready: demo / Demo@1234");
  } catch (error) {
    console.error("Failed to create demo user:", error.message);
  }
};

const createAdminUser = async () => {
  try {
    // Check if admin user already exists in SQLite
    const existingAdmin = detailsDb.findUserByUsernameOrEmail("admin");
    if (existingAdmin) {
      console.log("Admin account ready: admin / Admin@123");
      return;
    }

    const hashedPassword = await bcrypt.hash("Admin@123", 10);
    detailsDb.createUser({
      fullName: "CouponEx Admin",
      username: "admin",
      email: "admin@couponex.com",
      phoneNumber: "8888888888",
      password: hashedPassword,
    });

    // Set admin role
    const db = detailsDb.getDb();
    db.prepare("UPDATE users SET role = 'admin' WHERE username = 'admin'").run();

    console.log("Admin account ready: admin / Admin@123");
  } catch (error) {
    console.error("Failed to create admin user:", error.message);
  }
};

// Initialize SQLite and create demo + admin users
createDemoUser();
createAdminUser();

app.use(
  helmet({
    contentSecurityPolicy: false,
  })
);
app.use(
  cors({
    origin: true,
    credentials: true,
  }),
);
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

app.use(express.static(path.join(__dirname)));
app.use("/api/auth", authRoutes);
app.use("/api/profile", require("./src/routes/profileRoutes"));
app.use("/api", require("./src/routes/profileRoutes"));

app.get("/api/health", (req, res) => {
  res.json({ success: true, message: "CouponEx auth API is running." });
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

async function startServer() {
  const basePort = Number.parseInt(PORT, 10);
  const maxAttempts = 10;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const port = basePort + attempt;

    try {
      await new Promise((resolve, reject) => {
        const server = app.listen(port, () => {
          console.log(`Server listening on http://localhost:${port}`);
          resolve(server);
        });

        server.once("error", reject);
      });

      return;
    } catch (error) {
      if (error.code !== "EADDRINUSE") {
        throw error;
      }

      console.warn(`Port ${port} is busy, trying ${port + 1}...`);
    }
  }

  throw new Error("Unable to find an available port for the server");
}

startServer().catch((error) => {
  console.error("Failed to start server:", error.message);
  process.exit(1);
});
