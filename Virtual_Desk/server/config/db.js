import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

let mongoServer;

const connectDB = async () => {
  try {
    // Use MONGODB_URI from .env if provided, otherwise start an in-memory MongoDB
    if (process.env.MONGODB_URI && process.env.MONGODB_URI.startsWith("mongodb")) {
      const conn = await mongoose.connect(process.env.MONGODB_URI);
      console.log(`MongoDB connected: ${conn.connection.host}`);
    } else {
      // Start in-memory MongoDB server (no external MongoDB needed!)
      mongoServer = await MongoMemoryServer.create();
      const uri = mongoServer.getUri();
      const conn = await mongoose.connect(uri);
      console.log(`MongoDB In-Memory Server started: ${conn.connection.host}`);
      console.log("⚠️  Note: Data will reset when the server restarts (development mode)");
    }
  } catch (error) {
    console.error(`MongoDB connection error: ${error.message}`);
    console.log("Server will continue running without database connectivity. Some features may not work until the database is accessible.");
  }
};

// Graceful shutdown
process.on("SIGINT", async () => {
  if (mongoServer) {
    await mongoServer.stop();
    console.log("MongoDB In-Memory Server stopped.");
  }
  process.exit(0);
});

export default connectDB;