import express from "express";
import Booking from "../models/Booking.js";
import Business from "../models/Business.js";
import BusinessSettings from "../models/BusinessSettings.js";
import User from "../models/User.js";
import { protect, authorize } from "../middleware/auth.js";

const router = express.Router();

router.get("/business/:businessId", async (req, res) => {
  try {
    const { date } = req.query;
    const query = { business: req.params.businessId, status: { $ne: "cancelled" } };
    if (date) {
      const start = new Date(date);
      const end = new Date(date);
      end.setDate(end.getDate() + 1);
      query.date = { $gte: start, $lt: end };
    }
    const bookings = await Booking.find(query).sort({ date: 1, time: 1 });
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/mine", protect, async (req, res) => {
  try {
    const bookings = await Booking.find({ customer: req.user._id })
      .populate("business", "name slug")
      .sort({ date: -1 });
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const { businessId, serviceId, customerName, customerEmail, customerPhone, date, time, notes } =
      req.body;

    if (!businessId || !serviceId || !customerName || !customerEmail || !date || !time) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const business = await Business.findById(businessId);
    if (!business) {
      return res.status(404).json({ message: "Business not found" });
    }

    // Validate service exists and belongs to business
    const selectedService = business.services.id(serviceId);
    if (!selectedService) {
      return res.status(404).json({ message: "Service not found" });
    }

    // Validate against business hours and blackout dates
    const settings = await BusinessSettings.findOne({ business: businessId });
    if (settings) {
      const bookingDate = new Date(date + "T00:00:00");
      const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
      const dayName = dayNames[bookingDate.getDay()];
      const dayHours = settings.businessHours[dayName];

      // Check if the day is a day off
      if (!dayHours || !dayHours.open || !dayHours.close) {
        return res.status(400).json({ message: "Business is closed on this day" });
      }

      // Check if time is within business hours
      if (time < dayHours.open || time >= dayHours.close) {
        return res.status(400).json({ message: "Time is outside business hours" });
      }

      // Check blackout dates
      const dateStr = bookingDate.toISOString().split("T")[0];
      const isBlackout = settings.blackoutDates.some((bd) => {
        const bdStr = new Date(bd.date).toISOString().split("T")[0];
        return bdStr === dateStr;
      });

      if (isBlackout) {
        return res.status(400).json({ message: "This date is a blackout/holiday and cannot be booked" });
      }
    }

    const existingBooking = await Booking.findOne({
      business: businessId,
      date: new Date(date),
      time,
      status: { $in: ["pending", "confirmed"] },
    });

    if (existingBooking) {
      return res.status(409).json({ message: "This time slot is already booked" });
    }

    const booking = await Booking.create({
      business: businessId,
      service: serviceId,
      customerName,
      customerEmail,
      customerPhone,
      price: selectedService.price,
      date: new Date(date),
      time,
      duration: selectedService.duration,
      notes: notes || "",
    });

    res.status(201).json(booking);
  } catch (error) {
    console.error("Booking creation error:", error);
    res.status(500).json({ message: "Failed to create booking" });
  }
});

router.put("/:id/status", protect, authorize("owner", "staff"), async (req, res) => {
  try {
    const booking = await Booking.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status },
      { new: true }
    );
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }
    res.json(booking);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// PUT /api/bookings/:id — update booking details (staff, notes, etc.)
router.put("/:id", protect, authorize("owner", "staff"), async (req, res) => {
  try {
    const { staff, notes, status } = req.body;
    const updateData = {};
    if (staff !== undefined) updateData.staff = staff;
    if (notes !== undefined) updateData.notes = notes;
    if (status !== undefined) updateData.status = status;

    const booking = await Booking.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true }
    );
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }
    res.json(booking);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/all", protect, authorize("owner", "staff"), async (req, res) => {
  try {
    let business = await Business.findOne({ owner: req.user._id });
    if (!business) {
      const user = await User.findById(req.user._id).populate("business");
      if (!user || !user.business) {
        return res.status(404).json({ message: "Business not found" });
      }
      business = user.business;
    }

    const bookings = await Booking.find({ business: business._id })
      .sort({ date: -1, time: -1 })
      .limit(100);

    res.json(bookings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/dashboard", protect, authorize("owner", "staff"), async (req, res) => {
  try {
    let business = await Business.findOne({ owner: req.user._id });
    if (!business) {
      // For staff users, find the business they belong to via their user record
      const user = await User.findById(req.user._id).populate("business");
      if (!user || !user.business) {
        return res.status(404).json({ message: "Business not found" });
      }
      business = user.business;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [todayBookings, totalBookings, upcomingBookings, recentBookings] =
      await Promise.all([
        Booking.countDocuments({
          business: business._id,
          date: { $gte: today, $lt: tomorrow },
          status: { $ne: "cancelled" },
        }),
        Booking.countDocuments({ business: business._id }),
        Booking.find({
          business: business._id,
          date: { $gte: today },
          status: { $in: ["pending", "confirmed"] },
        })
          .sort({ date: 1, time: 1 })
          .limit(10),
        Booking.find({ business: business._id })
          .sort({ createdAt: -1 })
          .limit(10),
      ]);

    const totalRevenue = await Booking.aggregate([
      {
        $match: {
          business: business._id,
          status: "completed",
        },
      },
      { $group: { _id: null, total: { $sum: "$price" } } },
    ]);

    res.json({
      todayBookings,
      totalBookings,
      upcomingBookings,
      recentBookings,
      totalRevenue: totalRevenue[0]?.total || 0,
      business,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
