import express from "express";
import BusinessSettings from "../models/BusinessSettings.js";
import Business from "../models/Business.js";
import User from "../models/User.js";
import { protect, authorize } from "../middleware/auth.js";

const router = express.Router();

// Helper to get the business for the current user
async function getBusiness(userId) {
  let business = await Business.findOne({ owner: userId });
  if (!business) {
    const user = await User.findById(userId).populate("business");
    if (user && user.business) {
      business = user.business;
    }
  }
  return business;
}

// GET /api/settings — get business settings (hours + blackout dates)
router.get("/", protect, authorize("owner", "staff"), async (req, res) => {
  try {
    const business = await getBusiness(req.user._id);
    if (!business) {
      return res.status(404).json({ message: "Business not found" });
    }

    let settings = await BusinessSettings.findOne({ business: business._id });
    if (!settings) {
      // Create default settings
      settings = await BusinessSettings.create({
        business: business._id,
        businessHours: {
          monday: { open: "09:00", close: "18:00" },
          tuesday: { open: "09:00", close: "18:00" },
          wednesday: { open: "09:00", close: "18:00" },
          thursday: { open: "09:00", close: "18:00" },
          friday: { open: "09:00", close: "18:00" },
          saturday: { open: "09:00", close: "17:00" },
          sunday: { open: "", close: "" },
        },
        blackoutDates: [],
      });
    }

    res.json(settings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// PUT /api/settings — update business settings
router.put("/", protect, authorize("owner", "staff"), async (req, res) => {
  try {
    const business = await getBusiness(req.user._id);
    if (!business) {
      return res.status(404).json({ message: "Business not found" });
    }

    const { businessHours, blackoutDates } = req.body;

    const updateData = {};
    if (businessHours) updateData.businessHours = businessHours;
    if (blackoutDates !== undefined) updateData.blackoutDates = blackoutDates;

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

// GET /api/settings/availability — check if a given date/time is available
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
      return res.json({ available: true, message: "No settings configured" });
    }

    const bookingDate = new Date(date + "T00:00:00");
    const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    const dayName = dayNames[bookingDate.getDay()];
    const dayHours = settings.businessHours[dayName];

    // Check if the day is a day off (empty open/close)
    if (!dayHours || !dayHours.open || !dayHours.close) {
      return res.json({ available: false, message: "Business is closed on this day" });
    }

    // Check if time is within business hours
    if (time < dayHours.open || time >= dayHours.close) {
      return res.json({ available: false, message: "Time is outside business hours" });
    }

    // Check blackout dates
    const dateStr = bookingDate.toISOString().split("T")[0];
    const isBlackout = settings.blackoutDates.some((bd) => {
      const bdStr = new Date(bd.date).toISOString().split("T")[0];
      return bdStr === dateStr;
    });

    if (isBlackout) {
      return res.json({ available: false, message: "This date is a blackout/holiday" });
    }

    res.json({ available: true, message: "Slot is available" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;