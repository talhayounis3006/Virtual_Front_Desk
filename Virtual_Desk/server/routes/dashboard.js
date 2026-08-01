import express from "express";
import Booking from "../models/Booking.js";
import Business from "../models/Business.js";
import User from "../models/User.js";
import { protect, authorize } from "../middleware/auth.js";

const router = express.Router();

// GET /api/dashboard/stats
router.get("/stats", protect, authorize("owner", "staff"), async (req, res) => {
  try {
    let business = await Business.findOne({ owner: req.user._id });
    if (!business) {
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

    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);

    // Run all aggregations in parallel
    const [
      todayBookings,
      totalBookings,
      upcomingBookings,
      recentBookings,
      totalRevenueResult,
      bookingsPerDay,
      bookingsByStatus,
      revenuePerDay,
    ] = await Promise.all([
      // Today's bookings count (excl cancelled)
      Booking.countDocuments({
        business: business._id,
        date: { $gte: today, $lt: tomorrow },
        status: { $ne: "cancelled" },
      }),

      // All time bookings count
      Booking.countDocuments({ business: business._id }),

      // Upcoming bookings
      Booking.find({
        business: business._id,
        date: { $gte: today },
        status: { $in: ["pending", "confirmed"] },
      })
        .sort({ date: 1, time: 1 })
        .limit(10),

      // Recent bookings
      Booking.find({ business: business._id })
        .sort({ createdAt: -1 })
        .limit(10),

      // Total revenue from completed bookings
      Booking.aggregate([
        { $match: { business: business._id, status: "completed" } },
        { $group: { _id: null, total: { $sum: "$price" } } },
      ]),

      // Bookings per day for last 30 days
      Booking.aggregate([
        {
          $match: {
            business: business._id,
            date: { $gte: thirtyDaysAgo, $lt: tomorrow },
          },
        },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),

      // Bookings by status
      Booking.aggregate([
        { $match: { business: business._id } },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),

      // Revenue per day for last 30 days (completed only)
      Booking.aggregate([
        {
          $match: {
            business: business._id,
            status: "completed",
            date: { $gte: thirtyDaysAgo, $lt: tomorrow },
          },
        },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
            revenue: { $sum: "$price" },
          },
        },
        { $sort: { _id: 1 } },
      ]),
    ]);

    // Build a complete 30-day array for bookings per day (fill missing days with 0)
    const bookingsPerDayMap = {};
    for (const entry of bookingsPerDay) {
      bookingsPerDayMap[entry._id] = entry.count;
    }

    const revenuePerDayMap = {};
    for (const entry of revenuePerDay) {
      revenuePerDayMap[entry._id] = entry.revenue;
    }

    const bookingsPerDayArray = [];
    const revenuePerDayArray = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split("T")[0];
      bookingsPerDayArray.push({
        date: key,
        count: bookingsPerDayMap[key] || 0,
      });
      revenuePerDayArray.push({
        date: key,
        revenue: revenuePerDayMap[key] || 0,
      });
    }

    // Build status counts object
    const statusCounts = { pending: 0, confirmed: 0, completed: 0, cancelled: 0, "no-show": 0 };
    for (const entry of bookingsByStatus) {
      statusCounts[entry._id] = entry.count;
    }

    res.json({
      todayBookings,
      totalBookings,
      upcomingBookings,
      recentBookings,
      totalRevenue: totalRevenueResult[0]?.total || 0,
      business,
      bookingsPerDay: bookingsPerDayArray,
      bookingsByStatus: statusCounts,
      revenuePerDay: revenuePerDayArray,
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    res.status(500).json({ message: error.message });
  }
});

export default router;