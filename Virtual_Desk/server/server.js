/**
 * ============================================================
 *  SERVER ENTRY POINT — server.js
 * ============================================================
 *  This is the main entry point for the Node.js/Express backend.
 *  When you run `npm run dev` (or `npm start`), this file is executed.
 *
 *  WHAT THIS FILE DOES (High-Level):
 *  1. Loads environment variables from a `.env` file
 *  2. Creates an Express application instance
 *  3. Connects to MongoDB (real or in-memory)
 *  4. Starts background scheduled jobs (email reminders, review requests)
 *  5. Applies security middleware (helmet, CORS, rate limiting, etc.)
 *  6. Mounts all API route handlers
 *  7. Starts the HTTP server listening on a port
 *
 *  REVERSE-ENGINEERING TIP:
 *  Follow the flow: imports → config → middleware → routes → error handling → listen.
 *  Each section has a distinct responsibility.
 * ============================================================
 */

// ---- IMPORTS ----
// Express: the web framework that handles HTTP requests/responses
import express from "express";
// CORS: allows the frontend (different origin/port) to call this API
import cors from "cors";
// Helmet: sets security-related HTTP headers to protect against common web vulnerabilities
import helmet from "helmet";
// Compression: compresses HTTP responses (gzip) to reduce bandwidth
import compression from "compression";
// Rate limiting: prevents abuse by limiting how many requests an IP can make
import rateLimit from "express-rate-limit";
// Mongo sanitize: prevents NoSQL injection by stripping `$` and `.` from user input
import mongoSanitize from "express-mongo-sanitize";
// XSS clean: prevents cross-site scripting by sanitizing user input
import xss from "xss-clean";
// dotenv: loads variables from `.env` file into `process.env`
import dotenv from "dotenv";
// connectDB: our custom function that establishes the MongoDB connection
import connectDB from "./config/db.js";
// initScheduler: starts cron jobs (automatic emails)
import { initScheduler } from "./services/scheduler.js";
// Route handlers — each file defines a set of API endpoints under a common prefix
import authRoutes from "./routes/auth.js";           // /api/auth
import businessRoutes from "./routes/businesses.js"; // /api/businesses
import bookingRoutes from "./routes/bookings.js";    // /api/bookings
import chatRoutes from "./routes/chat.js";           // /api/chat
import dashboardRoutes from "./routes/dashboard.js"; // /api/dashboard
import settingsRoutes from "./routes/settings.js";   // /api/settings
import availabilityRoutes from "./routes/availability.js"; // /api/availability
import paymentRoutes from "./routes/payments.js";    // /api/payments

// Load environment variables from `.env` into process.env
dotenv.config();

// Create the Express application instance
const app = express();
// The port the server will listen on — from .env or default to 5000
const PORT = process.env.PORT || 5000;
const isProduction = process.env.NODE_ENV === "production";

if (isProduction && !process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET is required in production");
}

// ---- SECURITY & PARSING MIDDLEWARE ----
// Middleware = functions that run between receiving a request and sending a response.
// They can modify the request, check auth, log, etc.

// helmet() adds security headers to every response
app.use(helmet());

// cors() allows the configured frontend to call this API
const allowedOrigins = (process.env.CLIENT_URL || "http://localhost:3000")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    const isLocalDevelopmentOrigin =
      !isProduction && /^https?:\/\/(localhost|127\.0\.0\.1):(3000|3001)$/.test(origin || "");

    if (!origin || allowedOrigins.includes(origin) || isLocalDevelopmentOrigin) {
      return callback(null, true);
    }
    return callback(new Error("Origin is not allowed by CORS"));
  },
}));

// compression() compresses response bodies (smaller payloads = faster loading)
app.use(compression());

// express.urlencoded() parses form submissions (application/x-www-form-urlencoded)
app.use(express.urlencoded({ extended: true }));

// mongoSanitize() strips `$` operators and `.` from input to prevent NoSQL injection
app.use(mongoSanitize());

// xss() cleans user input to prevent cross-site scripting attacks
app.use(xss());

// Stripe webhook needs the RAW request body (not parsed JSON) so Stripe can
// verify the signature. This MUST be registered BEFORE express.json().
app.use("/api/payments/webhook", express.raw({ type: "application/json" }));

// express.json() parses incoming JSON request bodies into `req.body`
app.use(express.json());

// ---- RATE LIMITING ----
// Limits each IP to 100 requests per 15 minutes to prevent brute-force/DoS attacks
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes in milliseconds
  max: 100,                 // max 100 requests per window per IP
  message: "Too many requests from this IP, please try again later.",
  standardHeaders: true,    // send rate limit info in standard headers
  legacyHeaders: false,     // don't send deprecated headers
});
// Apply the rate limiter to all /api/ routes
app.use("/api/", limiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: "Too many sign-in attempts. Please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api/auth/login", authLimiter);

// ---- ROUTES ----
// Each router handles a specific domain. The prefix determines the URL path.
// Example: app.use("/api/auth", authRoutes) means authRoutes handles /api/auth/...
app.use("/api/auth", authRoutes);
app.use("/api/businesses", businessRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/availability", availabilityRoutes);
app.use("/api/payments", paymentRoutes);

// Health check endpoint — useful for monitoring/uptime checks
app.get("/api/health", (req, res) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() });
});

// ---- ERROR HANDLING MIDDLEWARE ----
// Express identifies error-handling middleware by having 4 parameters (err, req, res, next).
// Any error thrown in a route (via `next(err)` or thrown synchronously) lands here.
app.use((err, req, res, next) => {
  // Log the full stack trace to the server console for debugging
  console.error(err.stack);
  
  // Mongoose validation error — e.g., required field missing
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({ message: messages.join(', ') });
  }
  
  // Mongoose duplicate key error (code 11000) — e.g., email already exists
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(400).json({ message: `${field} already exists` });
  }
  
  // Mongoose CastError — e.g., invalid ObjectId format in URL
  if (err.name === 'CastError') {
    return res.status(400).json({ message: 'Invalid resource ID' });
  }
  
  // JWT errors — invalid or expired authentication tokens
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ message: 'Invalid token' });
  }
  
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ message: 'Token expired' });
  }
  
  // Fallback: use the error's status code if set, otherwise 500 (Internal Server Error)
  res.status(err.statusCode || 500).json({ 
    message: err.message || "Something went wrong!" 
  });
});

// ---- 404 HANDLER ----
// If no route matched the request URL, return a JSON 404 response
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

// ---- START THE SERVER ----
// app.listen() starts the HTTP server and begins accepting requests
async function startServer() {
  try {
    await connectDB();
    initScheduler();
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT} in ${process.env.NODE_ENV || "development"} mode`);
    });
  } catch (error) {
    console.error("Unable to start server:", error.message);
    process.exit(1);
  }
}

startServer();
