/**
 * ============================================================
 *  SEED SCRIPT — seed.js
 * ============================================================
 *  Populates the database with sample data for development/testing.
 *  Run with: `npm run seed`
 *
 *  WHAT IT CREATES:
 *  1. A test owner user (owner@test.com / password123)
 *  2. A sample business "Glamour Studio" with 5 services
 *  3. 18 random bookings spread across the last 30 days
 *
 *  KEY CONCEPTS TO LEARN:
 *  1. Seeding: inserting fake/realistic data so the app has something to show.
 *  2. Random Data Generation: uses Math.random() to create varied test data.
 *  3. Status Bias: past bookings are more likely to be "completed",
 *     today's bookings are more likely to be "confirmed" — realistic data.
 *  4. Idempotent: safe to run multiple times (clears old bookings first).
 * ============================================================
 */

// Mongoose: ODM for MongoDB
import mongoose from "mongoose";
// dotenv: loads .env variables
import dotenv from "dotenv";
// Models
import Booking from "./models/Booking.js";
import Business from "./models/Business.js";
import User from "./models/User.js";

// Load environment variables
dotenv.config();

// MongoDB connection string — from .env or default to localhost
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/virtual-frontdesk";

// ---- SAMPLE DATA ----

// Services offered by the sample business
const services = [
  { name: "Haircut & Blow-Dry", price: 55, duration: 60, description: "Wash, cut & style" },
  { name: "Balayage", price: 150, duration: 120, description: "Hand-painted highlights" },
  { name: "Manicure", price: 35, duration: 45, description: "Nail shaping, cuticle care & polish" },
  { name: "Pedicure", price: 45, duration: 50, description: "Foot soak, exfoliation & polish" },
  { name: "Deep Conditioning Treatment", price: 40, duration: 30, description: "Intensive moisture repair" },
];

// Staff members (used for assigning bookings)
const staffMembers = [
  { name: "Sarah Mitchell", role: "stylist" },
  { name: "James Chen", role: "nail technician" },
  { name: "Emily Rodriguez", role: "stylist" },
];

// Customer names for generating fake bookings
const customerNames = [
  "Alice Johnson", "Bob Williams", "Clara Davis", "David Brown",
  "Eva Martinez", "Frank Thomas", "Grace Lee", "Henry Wilson",
  "Irene Taylor", "Jack Anderson", "Karen Jackson", "Leo White",
  "Mona Harris", "Nathan Clark", "Olivia Lewis", "Paul Walker",
  "Quinn Hall", "Rachel Young", "Sam King", "Tina Wright",
];

// Possible appointment times
const times = ["09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "12:00", "13:00", "13:30", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30", "17:00"];

// Possible booking statuses
const statuses = ["confirmed", "completed", "cancelled", "no-show"];

// ---- HELPER FUNCTIONS ----

// Random integer between min and max (inclusive)
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Pick a random item from an array
function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Format a Date as "YYYY-MM-DD"
function formatDate(d) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * seed — the main seeding function.
 * Creates the owner, business, and sample bookings.
 */
async function seed() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGO_URI);
    console.log("Connected to MongoDB");

    // ---- 1. FIND OR CREATE THE OWNER ----
    let owner = await User.findOne({ role: "owner" });
    if (!owner) {
      console.log("No owner found. Creating test owner...");
      owner = await User.create({
        name: "Test Owner",
        email: "owner@test.com",
        password: "password123", // hashed automatically by the User model
        role: "owner",
      });
      console.log("Created test owner with email: owner@test.com / password: password123");
    }

    // ---- 2. FIND OR CREATE THE BUSINESS ----
    let business = await Business.findOne({ owner: owner._id });
    if (!business) {
      business = await Business.create({
        owner: owner._id,
        name: "Glamour Studio",
        slug: "glamour-studio", // URL-friendly identifier
        category: "salon",
        description: "Full-service salon offering haircuts, coloring, nails, and more.",
        services: services,
        phone: "555-0123",
        email: "hello@glamourstudio.com",
        businessHours: {
          monday: { open: "09:00", close: "18:00" },
          tuesday: { open: "09:00", close: "18:00" },
          wednesday: { open: "09:00", close: "18:00" },
          thursday: { open: "09:00", close: "18:00" },
          friday: { open: "09:00", close: "18:00" },
          saturday: { open: "09:00", close: "17:00" },
          sunday: { open: "", close: "" }, // closed
        },
      });
      console.log("Created business: Glamour Studio");
    }

    // ---- 3. CLEAR OLD BOOKINGS ----
    // Remove previous seed data so re-running doesn't duplicate
    await Booking.deleteMany({ business: business._id });
    console.log("Cleared old bookings");

    // ---- 4. GENERATE SAMPLE BOOKINGS ----
    const today = new Date();
    today.setHours(0, 0, 0, 0); // start of today

    const bookings = [];
    const usedSlots = new Set(); // prevent duplicate time slots

    // Generate 18 bookings spread across the last 30 days
    for (let i = 0; i < 18; i++) {
      // Pick a random day within the last 30 days
      const daysAgo = randomInt(0, 30);
      const bookingDate = new Date(today);
      bookingDate.setDate(bookingDate.getDate() - daysAgo);

      // Pick a random time, skip if this slot is already used
      let time = randomItem(times);
      const slotKey = `${formatDate(bookingDate)}-${time}`;
      if (usedSlots.has(slotKey)) continue;
      usedSlots.add(slotKey);

      // Pick a random service and customer
      const service = randomItem(services);
      const customerName = customerNames[i % customerNames.length];
      const customerEmail = customerName.toLowerCase().replace(" ", ".") + "@example.com";

      // Bias statuses so the data looks realistic:
      // - Today: mostly confirmed or pending
      // - Recent (≤3 days): mix of confirmed/completed/cancelled
      // - Past: mostly completed
      let status;
      if (daysAgo === 0) {
        status = Math.random() < 0.7 ? "confirmed" : "pending";
      } else if (daysAgo <= 3) {
        status = randomItem(["confirmed", "completed", "cancelled"]);
      } else {
        status = randomItem(["completed", "completed", "completed", "cancelled", "no-show"]);
      }

      // Build the booking object
      const booking = {
        business: business._id,
        customerName,
        customerEmail,
        customerPhone: `555-${String(randomInt(1000, 9999))}`,
        service: service.name,
        price: service.price,
        date: bookingDate,
        time,
        duration: service.duration,
        status,
        notes: Math.random() < 0.3 ? "Please call to confirm" : "",
      };
      bookings.push(booking);
    }

    // Insert all bookings in one batch operation
    await Booking.insertMany(bookings);
    console.log(`Inserted ${bookings.length} sample bookings`);

    // ---- 5. PRINT SUMMARY ----
    console.log("\n--- Seed Summary ---");
    console.log(`Business: ${business.name} (ID: ${business._id})`);
    console.log(`Owner email: ${owner.email}`);
    console.log(`Services: ${business.services.map(s => s.name).join(", ")}`);
    const statusCounts = {};
    for (const b of bookings) {
      statusCounts[b.status] = (statusCounts[b.status] || 0) + 1;
    }
    console.log("Bookings by status:", statusCounts);

    // Disconnect and exit
    await mongoose.disconnect();
    console.log("\nSeed complete!");
    process.exit(0);
  } catch (error) {
    console.error("Seed error:", error);
    process.exit(1);
  }
}

// Run the seed function
seed();