/**
 * ============================================================
 *  SETTINGS ROUTES — routes/settings.js
 * ============================================================
 *  Handles business settings endpoints:
 *    GET  /api/settings                  — get business hours + blackout dates
 *    PUT  /api/settings                  — update business hours + blackout dates
 *    GET  /api/settings/availability     — check if a date/time is available
 *
 *  KEY CONCEPTS TO LEARN:
 *  1. Upsert: `upsert: true` in findOneAndUpdate creates the document
 *     if it doesn't exist (instead of returning null).
 *  2. Default Settings: if no settings exist, sensible defaults are created.
 *  3. Availability Check: validates a specific date/time against
 *     business hours and blackout dates.
 * ============================================================
 */

// Express Router
import express from "express";
// Models
import BusinessSettings from "../models/BusinessSettings.js";
import Business from "../models/Business.js";
import User from "../models/User.js";
// Auth middleware
import { protect, authorize } from "../middleware/auth.js";

const router = express.Router();

/**
 * Helper: get the business for the current user.
 * Works for both owners (business.owner === userId) and staff
 * (user.business points to the business).
 */
async function getBusiness(userId) {
  // Try to find a business owned by this user
  let business = await Business.findOne({ owner: userId });
  if (!business) {
    // For staff: look up the user and get their linked business
    const user = await User.findById(userId).populate("business");
    if (user && user.business) {
      business = user.business;
    }
  }
  return business;
}

/**
 * GET /api/settings
 * PROTECTED (owner/staff) — returns the business settings.
 * If no settings exist, creates and returns defaults.
 */
router.get("/", protect, authorize("owner", "staff"), async (req, res) => {
  try {
    const business = await getBusiness(req.user._id);
    if (!business) {
      return res.status(404).json({ message: "Business not found" });
    }

    // Look up existing settings
    let settings = await BusinessSettings.findOne({ business: business._id });
    if (!settings) {
      // No settings yet — create with sensible defaults
      settings = await BusinessSettings.create({
        business: business._id,
        businessHours: {
          monday: { open: "09:00", close: "18:00" },
          tuesday: { open: "09:00", close: "18:00" },
          wednesday: { open: "09:00", close: "18:00" },
          thursday: { open: "09:00", close: "18:00" },
          friday: { open: "09:00", close: "18:00" },
          saturday: { open: "09:00", close: "17:00" },
          sunday: { open: "", close: "" }, // closed on Sunday
        },
        blackoutDates: [],
      });
    }

    res.json(settings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * PUT /api/settings
 * PROTECTED (owner/staff) — updates business settings.
 * Body: { businessHours?, blackoutDates? }
 */
router.put("/", protect, authorize("owner", "staff"), async (req, res) => {
  try {
    const business = await getBusiness(req.user._id);
    if (!business) {
      return res.status(404).json({ message: "Business not found" });
    }

    const { businessHours, blackoutDates } = req.body;

    // Build the update object — only include fields that were provided
    const updateData = {};
    if (businessHours) updateData.businessHours = businessHours;
    if (blackoutDates !== undefined) updateData.blackoutDates = blackoutDates;

    // findOneAndUpdate with upsert: true
    // - If settings exist → update them
    // - If they don't exist → CREATE them
    const settings = await BusinessSettings.findOneAndUpdate(
      { business: business._id },
      { $set: updateData },
      { new: true, upsert: true, runValidators: true }
    );

    res.json(settings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * GET /api/settings/availability?date=YYYY-MM-DD&time=HH:MM
 * PROTECTED (owner/staff) — checks if a specific date/time is available.
 * Used by the booking system to validate slots.
 */
router.get("/availability", protect, authorize("owner", "staff"), async (req, res) => {
  try {
    const business = await getBusiness(req.user._id);
    if (!business) {
      return res.status(404).json({ message: "Business not found" });
    }

    const { date, time } = req.query;
    if (!date || !time) {
      return res.status(400).json({ message: "Date and time are required" });
    }

    const settings = await BusinessSettings.findOne({ business: business._id });
    if (!settings) {
      // No settings configured → assume available
      return res.json({ available: true, message: "No settings configured" });
    }

    // Determine the day of the week for the requested date
    const bookingDate = new Date(date + "T00:00:00");
    const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    const dayName = dayNames[bookingDate.getDay()];
    const dayHours = settings.businessHours[dayName];

    // Check if the day is a day off (empty open/close)
    if (!dayHours || !dayHours.open || !dayHours.close) {
      return res.json({ available: false, message: "Business is closed on this day" });
    }

    // Check if the time is within business hours
    // String comparison works because times are "HH:MM" format
    if (time < dayHours.open || time >= dayHours.close) {
      return res.json({ available: false, message: "Time is outside business hours" });
    }

    // Check blackout dates (holidays)
    const dateStr = bookingDate.toISOString().split("T")[0];
    const isBlackout = settings.blackoutDates.some((bd) => {
      const bdStr = new Date(bd.date).toISOString().split("T")[0];
      return bdStr === dateStr;
    });

    if (isBlackout) {
      return res.json({ available: false, message: "This date is a blackout/holiday" });
    }

    // All checks passed — the slot is available
    res.json({ available: true, message: "Slot is available" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Export the router so server.js can mount it at /api/settings
export default router;