/**
 * ============================================================
 *  BOOKINGS ROUTES — routes/bookings.js
 * ============================================================
 *  Handles all booking-related endpoints:
 *    GET  /api/bookings/business/:businessId — public: get bookings for a business (by date)
 *    GET  /api/bookings/mine                 — protected: get logged-in user's bookings
 *    POST /api/bookings                      — public: create a new booking
 *    PUT  /api/bookings/:id/status           — protected: update booking status
 *    PUT  /api/bookings/:id                  — protected: update booking details
 *    GET  /api/bookings/all                  — protected: get all bookings for owner's business
 *    GET  /api/bookings/dashboard            — protected: get dashboard stats
 *
 *  KEY CONCEPTS TO LEARN:
 *  1. Route Protection: some routes use `protect` + `authorize` middleware
 *     to restrict access to authenticated owners/staff only.
 *  2. Business Hours Validation: new bookings are checked against the
 *     business's hours and blackout dates before being created.
 *  3. Conflict Detection: prevents double-booking the same time slot.
 *  4. Aggregation: MongoDB's `aggregate()` pipeline for computing revenue.
 * ============================================================
 */

// Express Router
import express from "express";
import crypto from "crypto";
import validator from "validator";
// Models
import Booking from "../models/Booking.js";
import Business from "../models/Business.js";
import BusinessSettings from "../models/BusinessSettings.js";
// Auth middleware
import { protect, authorize } from "../middleware/auth.js";
import { getBusinessForUser } from "../utils/getBusinessForUser.js";

const router = express.Router();

/**
 * GET /api/bookings/business/:businessId?date=YYYY-MM-DD
 * PUBLIC — used by the public booking page to show existing bookings.
 * Optionally filters by date.
 */
router.get("/business/:businessId", async (req, res) => {
  try {
    const { date } = req.query;
    // Base query: all bookings for this business, excluding cancelled ones
    const query = { business: req.params.businessId, status: { $ne: "cancelled" } };
    
    // If a date is provided, filter to that specific day
    if (date) {
      const start = new Date(date);          // start of day
      const end = new Date(date);            // end of day
      end.setDate(end.getDate() + 1);        // next day
      query.date = { $gte: start, $lt: end }; // date >= start AND date < end
    }
    
    // Sort by date then time for a chronological view
    // This route is used only to calculate availability. Never expose customer
    // names, emails, notes, payment metadata, or internal booking IDs publicly.
    const bookings = await Booking.find(query)
      .select("date time duration status")
      .sort({ date: 1, time: 1 })
      .lean();
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * GET /api/bookings/mine
 * PROTECTED — returns the logged-in user's own bookings.
 * Used by customer accounts to see their appointment history.
 */
router.get("/mine", protect, async (req, res) => {
  try {
    const bookings = await Booking.find({ customer: req.user._id })
      .populate("business", "name slug") // include business name + slug
      .sort({ date: -1 }); // newest first
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * POST /api/bookings
 * PUBLIC — creates a new booking.
 *
 * Request body: { businessId, serviceId, customerName, customerEmail, customerPhone, date, time, notes }
 *
 * VALIDATION FLOW:
 * 1. Required fields present?
 * 2. Business exists?
 * 3. Service exists and belongs to the business?
 * 4. Date/time within business hours?
 * 5. Not a blackout date?
 * 6. Time slot not already booked?
 */
router.post("/", async (req, res) => {
  try {
    const { businessId, serviceId, customerName, customerEmail, customerPhone, date, time, notes } =
      req.body;

    // 1. Check required fields
    if (!businessId || !serviceId || !customerName || !customerEmail || !date || !time) {
      return res.status(400).json({ message: "Missing required fields" });
    }
    if (!validator.isEmail(customerEmail) || customerName.trim().length < 2 || customerName.trim().length > 100) {
      return res.status(400).json({ message: "Please provide a valid name and email address" });
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(new Date(`${date}T00:00:00`).getTime())) {
      return res.status(400).json({ message: "Please provide a valid booking date" });
    }
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) {
      return res.status(400).json({ message: "Please provide a valid booking time" });
    }

    // 2. Check business exists
    const business = await Business.findById(businessId);
    if (!business) {
      return res.status(404).json({ message: "Business not found" });
    }

    // 3. Validate service exists and belongs to this business
    // `.id(serviceId)` is a Mongoose helper that finds a sub-document by _id
    const selectedService = business.services.id(serviceId);
    if (!selectedService) {
      return res.status(404).json({ message: "Service not found" });
    }

    // 4. Validate against business hours and blackout dates
    const settings = await BusinessSettings.findOne({ business: businessId });
    if (settings) {
      const bookingDate = new Date(date + "T00:00:00");
      // getDay() returns 0=Sunday, 1=Monday, ..., 6=Saturday
      const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
      const dayName = dayNames[bookingDate.getDay()];
      const dayHours = settings.businessHours[dayName];

      // Check if the day is a day off (no open/close times set)
      if (!dayHours || !dayHours.open || !dayHours.close) {
        return res.status(400).json({ message: "Business is closed on this day" });
      }

      // Check if the requested time is within business hours
      // String comparison works because times are "HH:MM" format
      if (time < dayHours.open || time >= dayHours.close) {
        return res.status(400).json({ message: "Time is outside business hours" });
      }

      // 5. Check blackout dates (holidays)
      const dateStr = bookingDate.toISOString().split("T")[0];
      const isBlackout = settings.blackoutDates.some((bd) => {
        const bdStr = new Date(bd.date).toISOString().split("T")[0];
        return bdStr === dateStr;
      });

      if (isBlackout) {
        return res.status(400).json({ message: "This date is a blackout/holiday and cannot be booked" });
      }
    }

    // 6. Check for time slot conflicts (double-booking prevention)
    const existingBooking = await Booking.findOne({
      business: businessId,
      date: new Date(date),
      time,
      status: { $in: ["pending", "confirmed"] }, // only active bookings block the slot
    });

    if (existingBooking) {
      return res.status(409).json({ message: "This time slot is already booked" });
    }

    // All validations passed — create the booking
    const booking = await Booking.create({
      business: businessId,
      service: selectedService.name,
      customerName: customerName.trim(),
      customerEmail: customerEmail.trim().toLowerCase(),
      customerPhone: customerPhone?.trim(),
      price: selectedService.price, // snapshot the price at booking time
      date: new Date(date),
      time,
      duration: selectedService.duration, // snapshot the duration
      notes: notes || "",
      checkoutToken: crypto.randomBytes(32).toString("hex"),
    });

    const response = booking.toObject();
    delete response.checkoutToken;
    res.status(201).json({
      ...response,
      paymentAccessToken: booking.checkoutToken,
    });
  } catch (error) {
    console.error("Booking creation error:", error);
    res.status(500).json({ message: "Failed to create booking" });
  }
});

/**
 * PUT /api/bookings/:id/status
 * PROTECTED (owner/staff) — updates just the status of a booking.
 * Body: { status }
 */
router.put("/:id/status", protect, authorize("owner", "staff"), async (req, res) => {
  try {
    const business = await getBusinessForUser(req.user._id);
    if (!business) {
      return res.status(404).json({ message: "Business not found" });
    }

    const booking = await Booking.findByIdAndUpdate(
      { _id: req.params.id, business: business._id },
      { status: req.body.status },
      { new: true, runValidators: true }
    );
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }
    res.json(booking);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * PUT /api/bookings/:id
 * PROTECTED (owner/staff) — updates booking details (staff, notes, status).
 * Body: { staff?, notes?, status? }
 */
router.put("/:id", protect, authorize("owner", "staff"), async (req, res) => {
  try {
    const business = await getBusinessForUser(req.user._id);
    if (!business) {
      return res.status(404).json({ message: "Business not found" });
    }

    const { staff, notes, status } = req.body;
    
    // Build the update object dynamically — only include fields that were provided
    const updateData = {};
    if (staff !== undefined) updateData.staff = staff;
    if (notes !== undefined) updateData.notes = notes;
    if (status !== undefined) updateData.status = status;

    // $set only updates the specified fields (doesn't overwrite the whole doc)
    const booking = await Booking.findByIdAndUpdate(
      { _id: req.params.id, business: business._id },
      { $set: updateData },
      { new: true, runValidators: true }
    );
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }
    res.json(booking);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * GET /api/bookings/all
 * PROTECTED (owner/staff) — returns all bookings for the user's business.
 * Used by the Bookings management page.
 */
router.get("/all", protect, authorize("owner", "staff"), async (req, res) => {
  try {
    // Find the business owned by this user
    const business = await getBusinessForUser(req.user._id);
    if (!business) return res.status(404).json({ message: "Business not found" });

    // Get the most recent 100 bookings for this business
    const bookings = await Booking.find({ business: business._id })
      .sort({ date: -1, time: -1 })
      .limit(100);

    res.json(bookings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * GET /api/bookings/dashboard
 * PROTECTED (owner/staff) — returns dashboard summary stats.
 * Used by the Dashboard page.
 */
router.get("/dashboard", protect, authorize("owner", "staff"), async (req, res) => {
  try {
    // Find the user's business (owner or staff)
    const business = await getBusinessForUser(req.user._id);
    if (!business) return res.status(404).json({ message: "Business not found" });

    // Calculate today's date range
    const today = new Date();
    today.setHours(0, 0, 0, 0); // start of today
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1); // start of tomorrow

    // Run all queries in PARALLEL using Promise.all for performance
    const [todayBookings, totalBookings, upcomingBookings, recentBookings] =
      await Promise.all([
        // Count today's bookings (excluding cancelled)
        Booking.countDocuments({
          business: business._id,
          date: { $gte: today, $lt: tomorrow },
          status: { $ne: "cancelled" },
        }),
        // Count all bookings ever
        Booking.countDocuments({ business: business._id }),
        // Get next 10 upcoming bookings
        Booking.find({
          business: business._id,
          date: { $gte: today },
          status: { $in: ["pending", "confirmed"] },
        })
          .sort({ date: 1, time: 1 })
          .limit(10),
        // Get 10 most recently created bookings
        Booking.find({ business: business._id })
          .sort({ createdAt: -1 })
          .limit(10),
      ]);

    // Compute total revenue from completed bookings using MongoDB aggregation
    // $match: filter documents → $group: sum the price field
    const totalRevenue = await Booking.aggregate([
      {
        $match: {
          business: business._id,
          status: "completed", // only count completed bookings as revenue
        },
      },
      { $group: { _id: null, total: { $sum: "$price" } } },
    ]);

    res.json({
      todayBookings,
      totalBookings,
      upcomingBookings,
      recentBookings,
      totalRevenue: totalRevenue[0]?.total || 0, // aggregate returns array; grab first result
      business,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Export the router so server.js can mount it at /api/bookings
export default router;
