/**
 * ============================================================
 *  DATABASE CONNECTION — config/db.js
 * ============================================================
 *  This module handles connecting to MongoDB.
 *
 *  KEY CONCEPT — Two Modes:
 *  1. REAL MongoDB: If `MONGODB_URI` is set in `.env` (starts with "mongodb"),
 *     it connects to that actual database (e.g., MongoDB Atlas or local install).
 *  2. IN-MEMORY MongoDB: If no URI is set, it starts a temporary in-memory
 *     MongoDB server using `mongodb-memory-server`. This is great for
 *     development/testing because you don't need MongoDB installed.
 *     ⚠️ Data resets every time the server restarts in this mode!
 *
 *  REVERSE-ENGINEERING TIP:
 *  Notice the graceful shutdown handler — it listens for SIGINT (Ctrl+C)
 *  and stops the in-memory server cleanly before exiting.
 * ============================================================
 */

// Mongoose: the ODM (Object Document Mapper) that lets us work with MongoDB
// using JavaScript objects instead of raw queries
import mongoose from "mongoose";
// MongoMemoryServer: spins up a real MongoDB server in memory (no install needed)
import { MongoMemoryServer } from "mongodb-memory-server";

// Holds a reference to the in-memory server so we can stop it on shutdown
let mongoServer;

/**
 * connectDB — establishes the MongoDB connection.
 * Called once at server startup (from server.js).
 */
const connectDB = async () => {
  try {
    // Check if a real MongoDB URI was provided in .env
    if (process.env.MONGODB_URI && process.env.MONGODB_URI.startsWith("mongodb")) {
      // Connect to the real MongoDB database
      const conn = await mongoose.connect(process.env.MONGODB_URI);
      console.log(`MongoDB connected: ${conn.connection.host}`);
    } else {
      // No URI provided → start an in-memory MongoDB server
      // This is perfect for local development without installing MongoDB
      mongoServer = await MongoMemoryServer.create();
      const uri = mongoServer.getUri(); // Get the temporary connection string
      const conn = await mongoose.connect(uri);
      console.log(`MongoDB In-Memory Server started: ${conn.connection.host}`);
      console.log("⚠️  Note: Data will reset when the server restarts (development mode)");
    }
  } catch (error) {
    // If connection fails, log the error but DON'T crash the server.
    // The app can still start; features that need DB will fail gracefully.
    console.error(`MongoDB connection error: ${error.message}`);
    console.log("Server will continue running without database connectivity. Some features may not work until the database is accessible.");
  }
};

// ---- GRACEFUL SHUTDOWN ----
// When the process receives SIGINT (Ctrl+C in terminal), stop the in-memory
// MongoDB server before exiting so no orphan processes are left running.
process.on("SIGINT", async () => {
  if (mongoServer) {
    await mongoServer.stop();
    console.log("MongoDB In-Memory Server stopped.");
  }
  process.exit(0);
});

// Export the connectDB function so server.js can call it
export default connectDB;