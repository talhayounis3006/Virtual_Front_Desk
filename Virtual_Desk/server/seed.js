import mongoose from "mongoose";
import dotenv from "dotenv";
import Booking from "./models/Booking.js";
import Business from "./models/Business.js";
import User from "./models/User.js";

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/virtual-frontdesk";

const services = [
  { name: "Haircut & Blow-Dry", price: 55, duration: 60, description: "Wash, cut & style" },
  { name: "Balayage", price: 150, duration: 120, description: "Hand-painted highlights" },
  { name: "Manicure", price: 35, duration: 45, description: "Nail shaping, cuticle care & polish" },
  { name: "Pedicure", price: 45, duration: 50, description: "Foot soak, exfoliation & polish" },
  { name: "Deep Conditioning Treatment", price: 40, duration: 30, description: "Intensive moisture repair" },
];

const staffMembers = [
  { name: "Sarah Mitchell", role: "stylist" },
  { name: "James Chen", role: "nail technician" },
  { name: "Emily Rodriguez", role: "stylist" },
];

const customerNames = [
  "Alice Johnson", "Bob Williams", "Clara Davis", "David Brown",
  "Eva Martinez", "Frank Thomas", "Grace Lee", "Henry Wilson",
  "Irene Taylor", "Jack Anderson", "Karen Jackson", "Leo White",
  "Mona Harris", "Nathan Clark", "Olivia Lewis", "Paul Walker",
  "Quinn Hall", "Rachel Young", "Sam King", "Tina Wright",
];

const times = ["09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "12:00", "13:00", "13:30", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30", "17:00"];

const statuses = ["confirmed", "completed", "cancelled", "no-show"];

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function formatDate(d) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

async function seed() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("Connected to MongoDB");

    // Find the first owner user to associate the business
    let owner = await User.findOne({ role: "owner" });
    if (!owner) {
      console.log("No owner found. Creating test owner...");
      owner = await User.create({
        name: "Test Owner",
        email: "owner@test.com",
        password: "password123",
        role: "owner",
      });
      console.log("Created test owner with email: owner@test.com / password: password123");
    }

    // Find or create a business
    let business = await Business.findOne({ owner: owner._id });
    if (!business) {
      business = await Business.create({
        owner: owner._id,
        name: "Glamour Studio",
        slug: "glamour-studio",
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
          sunday: { open: "", close: "" },
        },
      });
      console.log("Created business: Glamour Studio");
    }

    // Clear old bookings for this business
    await Booking.deleteMany({ business: business._id });
    console.log("Cleared old bookings");

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const bookings = [];
    const usedSlots = new Set();

    // Generate 18 bookings spread across the last 30 days
    for (let i = 0; i < 18; i++) {
      // Determine a random day within the last 30 days
      const daysAgo = randomInt(0, 30);
      const bookingDate = new Date(today);
      bookingDate.setDate(bookingDate.getDate() - daysAgo);

      // Pick a random time
      let time = randomItem(times);
      const slotKey = `${formatDate(bookingDate)}-${time}`;
      if (usedSlots.has(slotKey)) continue;
      usedSlots.add(slotKey);

      const service = randomItem(services);
      const customerName = customerNames[i % customerNames.length];
      const customerEmail = customerName.toLowerCase().replace(" ", ".") + "@example.com";

      // Bias statuses so past dates are more likely to be completed/cancelled/no-show
      let status;
      if (daysAgo === 0) {
        // Today: mostly confirmed or pending
        status = Math.random() < 0.7 ? "confirmed" : "pending";
      } else if (daysAgo <= 3) {
        // Recent: mix
        status = randomItem(["confirmed", "completed", "cancelled"]);
      } else {
        // Past: mostly completed
        status = randomItem(["completed", "completed", "completed", "cancelled", "no-show"]);
      }

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

    await Booking.insertMany(bookings);
    console.log(`Inserted ${bookings.length} sample bookings`);

    console.log("\n--- Seed Summary ---");
    console.log(`Business: ${business.name} (ID: ${business._id})`);
    console.log(`Owner email: ${owner.email}`);
    console.log(`Services: ${business.services.map(s => s.name).join(", ")}`);
    const statusCounts = {};
    for (const b of bookings) {
      statusCounts[b.status] = (statusCounts[b.status] || 0) + 1;
    }
    console.log("Bookings by status:", statusCounts);

    await mongoose.disconnect();
    console.log("\nSeed complete!");
    process.exit(0);
  } catch (error) {
    console.error("Seed error:", error);
    process.exit(1);
  }
}

seed();