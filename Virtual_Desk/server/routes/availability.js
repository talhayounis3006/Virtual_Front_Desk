/**
 * ============================================================
 *  AVAILABILITY ROUTES — routes/availability.js
 * ============================================================
 *  Handles the availability endpoint:
 *    GET /api/availability/:businessId?date=YYYY-MM-DD&serviceId=xxx
 *
 *  PURPOSE:
 *  Returns an array of available time slots for a business on a given date.
 *  Used by the public booking page to show which times customers can book.
 *
 *  ALGORITHM (Reverse-Engineering Guide):
 *  1. Determine business hours for the day-of-week from BusinessSettings
 *     (fallback to Business model hours).
 *  2. If closed (no open/close), return [].
 *  3. Generate 30-minute slots between open and close.
 *  4. Remove slots that fall inside an existing booking's time window
 *     (booking start = time, end = time + duration minutes).
 *  5. If a serviceId is provided, also filter out slots that wouldn't fit
 *     the service duration before the next booking or closing time.
 * ============================================================
 */

// Express Router
import express from "express";
// Models
import Business from "../models/Business.js";
import BusinessSettings from "../models/BusinessSettings.js";
import Booking from "../models/Booking.js";

const router = express.Router();

// Day name lookup: getDay() returns 0=Sunday ... 6=Saturday
const DAY_NAMES = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

/**
 * GET /api/availability/:businessId?date=YYYY-MM-DD&serviceId=xxx
 * PUBLIC — returns available time slots for the given business + date.
 */
router.get("/:businessId", async (req, res) => {
  try {
    const { businessId } = req.params;
    const { date, serviceId } = req.query;

    // Date is required
    if (!date) {
      return res.status(400).json({ message: "date query parameter is required (YYYY-MM-DD)" });
    }

    // 1. Resolve business hours
    // Try BusinessSettings first (more specific), fall back to Business model
    const settings = await BusinessSettings.findOne({ business: businessId });
    const business = await Business.findById(businessId);

    if (!business) {
      return res.status(404).json({ message: "Business not found" });
    }

    // Determine which day of the week the requested date falls on
    const bookingDate = new Date(date + "T00:00:00");
    const dayName = DAY_NAMES[bookingDate.getDay()];

    // Try settings first, fall back to business-level hours
    let dayHours = settings?.businessHours?.[dayName];
    if (!dayHours || (!dayHours.open && !dayHours.close)) {
      dayHours = business.businessHours?.[dayName];
    }

    // Business is closed on this day
    if (!dayHours || !dayHours.open || !dayHours.close) {
      return res.json({ slots: [], message: "Business is closed on this day" });
    }

    // 2. Check blackout dates (holidays)
    if (settings?.blackoutDates?.length) {
      const dateStr = bookingDate.toISOString().split("T")[0];
      const isBlackout = settings.blackoutDates.some((bd) => {
        const bdStr = new Date(bd.date).toISOString().split("T")[0];
        return bdStr === dateStr;
      });
      if (isBlackout) {
        return res.json({ slots: [], message: "This date is a blackout/holiday" });
      }
    }

    // 3. Generate all 30-minute time slots for the day
    // Example: 09:00-17:00 → ["09:00", "09:30", ..., "16:30"]
    const allSlots = generateTimeSlots(dayHours.open, dayHours.close, 30);

    // 4. Fetch existing bookings for this business + date (exclude cancelled/no-show)
    const dayStart = new Date(date + "T00:00:00");
    const dayEnd = new Date(date + "T23:59:59");

    const existingBookings = await Booking.find({
      business: businessId,
      date: { $gte: dayStart, $lte: dayEnd },
      status: { $nin: ["cancelled", "no-show"] },
    }).sort({ time: 1 });

    // 5. Build a set of occupied slot keys "HH:MM"
    // For each booking, mark every slot that falls within its time window
    const occupiedSlots = new Set();
    for (const booking of existingBookings) {
      const startMinutes = timeToMinutes(booking.time);
      const endMinutes = startMinutes + booking.duration;
      for (const slot of allSlots) {
        const slotMinutes = timeToMinutes(slot);
        if (slotMinutes >= startMinutes && slotMinutes < endMinutes) {
          occupiedSlots.add(slot);
        }
      }
    }

    // 6. If serviceId provided, also ensure the slot has enough room
    // for the service duration (before closing or the next booking)
    let serviceDuration = null;
    if (serviceId) {
      const svc = business.services.id(serviceId);
      if (svc) {
        serviceDuration = svc.duration;
      }
    }

    // Filter the available slots
    const availableSlots = allSlots.filter((slot) => {
      // Slot is already occupied by another booking
      if (occupiedSlots.has(slot)) return false;

      // If we know the service duration, verify the slot + duration fits
      // before the next booking or closing time
      if (serviceDuration) {
        const slotStart = timeToMinutes(slot);
        const slotEnd = slotStart + serviceDuration;
        const closeMinutes = timeToMinutes(dayHours.close);

        // Service would run past closing time
        if (slotEnd > closeMinutes) return false;

        // Service would overlap with the next booking
        for (const booking of existingBookings) {
          const bookingStart = timeToMinutes(booking.time);
          if (slotStart < bookingStart && slotEnd > bookingStart) {
            return false;
          }
        }
      }

      return true;
    });

    res.json({ slots: availableSlots, date, businessId });
  } catch (error) {
    console.error("Availability error:", error);
    res.status(500).json({ message: "Failed to calculate availability" });
  }
});

/* ============================================================
 *  HELPER FUNCTIONS
 * ============================================================ */

/**
 * generateTimeSlots — creates an array of time slots between open and close.
 * Example: generateTimeSlots("09:00", "17:00", 30)
 * → ["09:00", "09:30", "10:00", ..., "16:30"]
 */
function generateTimeSlots(open, close, intervalMinutes) {
  const slots = [];
  const openMin = timeToMinutes(open);
  const closeMin = timeToMinutes(close);
  for (let m = openMin; m < closeMin; m += intervalMinutes) {
    slots.push(minutesToTime(m));
  }
  return slots;
}

/**
 * timeToMinutes — converts "HH:MM" to total minutes since midnight.
 * Example: "14:30" → 870
 */
function timeToMinutes(t) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

/**
 * minutesToTime — converts minutes since midnight to "HH:MM".
 * Example: 870 → "14:30"
 */
function minutesToTime(m) {
  const h = Math.floor(m / 60);
  const min = m % 60;
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

// Export the router so server.js can mount it at /api/availability
export default router;