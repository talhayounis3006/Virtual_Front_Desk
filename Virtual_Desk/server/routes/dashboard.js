/**
 * ============================================================
 *  DASHBOARD ROUTES — routes/dashboard.js
 * ============================================================
 *  Handles the business owner's dashboard analytics endpoint:
 *    GET /api/dashboard/stats — returns all dashboard statistics
 *
 *  WHAT IT RETURNS:
 *  - todayBookings: count of today's bookings
 *  - totalBookings: all-time booking count
 *  - upcomingBookings: next 10 upcoming appointments
 *  - recentBookings: 10 most recently created bookings
 *  - totalRevenue: sum of all completed booking prices
 *  - bookingsPerDay: 30-day array of booking counts (for line chart)
 *  - bookingsByStatus: counts grouped by status (for bar chart)
 *  - revenuePerDay: 30-day array of revenue (for revenue chart)
 *
 *  KEY CONCEPTS TO LEARN:
 *  1. Promise.all: runs multiple independent DB queries in PARALLEL
 *     for better performance (instead of awaiting them one by one).
 *  2. Aggregation Pipeline: MongoDB's $match → $group → $sort stages
 *     for computing grouped statistics.
 *  3. Data Filling: the 30-day arrays are filled with zeros for days
 *     with no bookings so charts display correctly.
 * ============================================================
 */

// Express Router
import express from "express";
// Models
import Booking from "../models/Booking.js";
import Business from "../models/Business.js";
import User from "../models/User.js";
// Auth middleware
import { protect, authorize } from "../middleware/auth.js";

const router = express.Router();

/**
 * GET /api/dashboard/stats
 * PROTECTED (owner/staff) — returns all dashboard statistics.
 * Used by the Dashboard page to render charts and stat cards.
 */
router.get("/stats", protect, authorize("owner", "staff"), async (req, res) => {
  try {
    // Find the user's business (owner or staff)
    let business = await Business.findOne({ owner: req.user._id });
    if (!business) {
      // For staff users, find the business via their user record
      const user = await User.findById(req.user._id).populate("business");
      if (!user || !user.business) {
        return res.status(404).json({ message: "Business not found" });
      }
      business = user.business;
    }

    // ---- DATE RANGES ----
    // Today: from 00:00:00 to 23:59:59
    const today = new Date();
    today.setHours(0, 0, 0, 0); // start of today
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1); // start of tomorrow

    // 30 days ago (for the charts)
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);

    // ---- RUN ALL QUERIES IN PARALLEL ----
    // Promise.all runs all these DB operations simultaneously.
    // This is much faster than awaiting them sequentially.
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
      // 1. Today's bookings count (excluding cancelled)
      Booking.countDocuments({
        business: business._id,
        date: { $gte: today, $lt: tomorrow },
        status: { $ne: "cancelled" },
      }),

      // 2. All-time bookings count
      Booking.countDocuments({ business: business._id }),

      // 3. Next 10 upcoming bookings (pending or confirmed)
      Booking.find({
        business: business._id,
        date: { $gte: today },
        status: { $in: ["pending", "confirmed"] },
      })
        .sort({ date: 1, time: 1 }) // soonest first
        .limit(10),

      // 4. 10 most recently created bookings
      Booking.find({ business: business._id })
        .sort({ createdAt: -1 }) // newest first
        .limit(10),

      // 5. Total revenue from completed bookings
      // Aggregation: $match filters → $group sums the price
      Booking.aggregate([
        { $match: { business: business._id, status: "completed" } },
        { $group: { _id: null, total: { $sum: "$price" } } },
      ]),

      // 6. Bookings per day for the last 30 days
      // Groups bookings by date string (YYYY-MM-DD) and counts them
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
        { $sort: { _id: 1 } }, // sort by date ascending
      ]),

      // 7. Bookings grouped by status (for the bar chart)
      Booking.aggregate([
        { $match: { business: business._id } },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),

      // 8. Revenue per day for the last 30 days (completed only)
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

    // ---- BUILD COMPLETE 30-DAY ARRAYS ----
    // The aggregation only returns days that HAVE bookings.
    // For the chart, we need every day filled — missing days get 0.

    // Convert aggregation results into lookup maps: { "2026-08-01": 3, ... }
    const bookingsPerDayMap = {};
    for (const entry of bookingsPerDay) {
      bookingsPerDayMap[entry._id] = entry.count;
    }

    const revenuePerDayMap = {};
    for (const entry of revenuePerDay) {
      revenuePerDayMap[entry._id] = entry.revenue;
    }

    // Build arrays for all 30 days (oldest → newest)
    const bookingsPerDayArray = [];
    const revenuePerDayArray = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i); // go back i days
      const key = d.toISOString().split("T")[0]; // "YYYY-MM-DD"
      bookingsPerDayArray.push({
        date: key,
        count: bookingsPerDayMap[key] || 0, // 0 if no bookings that day
      });
      revenuePerDayArray.push({
        date: key,
        revenue: revenuePerDayMap[key] || 0,
      });
    }

    // ---- BUILD STATUS COUNTS OBJECT ----
    // Ensure all statuses are present (even if count is 0)
    const statusCounts = { pending: 0, confirmed: 0, completed: 0, cancelled: 0, "no-show": 0 };
    for (const entry of bookingsByStatus) {
      statusCounts[entry._id] = entry.count;
    }

    // Return everything the dashboard needs
    res.json({
      todayBookings,
      totalBookings,
      upcomingBookings,
      recentBookings,
      totalRevenue: totalRevenueResult[0]?.total || 0, // aggregate returns array
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

// Export the router so server.js can mount it at /api/dashboard
export default router;