/**
 * ============================================================
 *  DASHBOARD PAGE — pages/Dashboard.jsx
 * ============================================================
 *  The business owner's main dashboard with analytics and charts.
 *
 *  WHAT IT SHOWS:
 *  - Stat cards: Today's Bookings, All Time Bookings, Upcoming, Active Services
 *  - Line chart: Bookings per day (last 30 days)
 *  - Bar chart: Bookings by status
 *  - Lists: Upcoming bookings and Recent activity
 *
 *  KEY CONCEPTS TO LEARN:
 *  1. Data fetching: useEffect + api.dashboard.getStats()
 *  2. Loading/error states: conditional rendering
 *  3. Recharts: a React charting library (LineChart, BarChart, etc.)
 *  4. Data transformation: converting API data into chart-friendly format
 * ============================================================
 */

// React hooks
import { useState, useEffect } from "react";
// React Router
import { Link, useNavigate } from "react-router-dom";
// API helper
import { api } from "../services/api.js";
// Recharts: charting library components
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell, Legend,
} from "recharts";

/* ---- SVG ICON COMPONENTS ---- */

// Calendar icon — stat card
function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4" />
      <path d="M8 2v4" />
      <path d="M3 10h18" />
      <path d="M8 14h.01" />
      <path d="M12 14h.01" />
      <path d="M16 14h.01" />
      <path d="M8 18h.01" />
      <path d="M12 18h.01" />
      <path d="M16 18h.01" />
    </svg>
  );
}

// Bar chart icon — stat card
function BarChartIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 20V10" />
      <path d="M12 20V4" />
      <path d="M6 20v-6" />
    </svg>
  );
}

// Clock icon — stat card
function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

// Gear icon — stat card
function SettingsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

// Calendar icon — upcoming bookings
function UpcomingIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4" />
      <path d="M8 2v4" />
      <path d="M3 10h18" />
    </svg>
  );
}

// Activity/pulse icon — recent activity
function ActivityIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  );
}

// Color mapping for booking statuses (used in charts and badges)
const STATUS_COLORS = {
  confirmed: "#3b82f6",  // blue
  completed: "#22c55e",  // green
  cancelled: "#ef4444",  // red
  "no-show": "#f59e0b",  // amber
  pending: "#8b5cf6",    // purple
};

/**
 * formatDateLabel — converts "2026-08-01" to "Aug 1" for chart axis labels.
 */
function formatDateLabel(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/**
 * Dashboard — the main analytics dashboard.
 */
export default function Dashboard() {
  const navigate = useNavigate();
  // Dashboard data from the API
  const [data, setData] = useState(null);
  // Loading state
  const [loading, setLoading] = useState(true);
  // Error message
  const [error, setError] = useState("");

  // Fetch dashboard stats on component mount
  useEffect(() => {
    api.dashboard
      .getStats() // GET /api/dashboard/stats
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  // Loading state
  if (loading)
    return (
      <div className="loading-page">
        <div className="loading-spinner" /> Loading dashboard...
      </div>
    );
  // Error state
  if (error)
    return (
      <div className="loading-page" style={{ color: "var(--danger)" }}>
        {error}
      </div>
    );
  // No data state
  if (!data)
    return (
      <div className="loading-page">Could not load dashboard. Try again.</div>
    );

  // Avatar color rotation
  const colors = ["blue", "green", "purple", "amber"];

  // Transform bookingsByStatus object into chart data format
  // { pending: 3, confirmed: 5 } → [{ name: "Pending", count: 3, fill: "#8b5cf6" }, ...]
  const statusChartData = Object.entries(data.bookingsByStatus || {}).map(([status, count]) => ({
    name: status.charAt(0).toUpperCase() + status.slice(1), // "pending" → "Pending"
    count,
    fill: STATUS_COLORS[status] || "#6b7280", // color for this status
  }));

  return (
    <div>
      {/* Page header with business name + booking page link */}
      <div className="page-header">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
          }}
        >
          <div>
            <h1>{data.business?.name}</h1>
            <p className="page-subtitle">
              {data.business?.category} &middot; Here's your overview for today
            </p>
          </div>
          <div style={{ display: "flex", gap: "0.5rem" }}>
              {/* Link to the public booking page */}
              {data.business?.slug && (
                <Link
                  to={`/book/${data.business.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-primary btn-sm"
                >
                  Booking Page
                </Link>
              )}
          </div>
        </div>
      </div>

      <div className="page-body">
        {/* ---- STAT CARDS ---- */}
        <div className="grid grid-4" style={{ marginBottom: "1.5rem" }}>
          <div className="stat-card">
            <div className="stat-icon blue"><CalendarIcon /></div>
            <div className="stat-value">{data.todayBookings}</div>
            <div className="stat-label">Today's Bookings</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon green"><BarChartIcon /></div>
            <div className="stat-value">{data.totalBookings}</div>
            <div className="stat-label">All Time Bookings</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon purple"><ClockIcon /></div>
            <div className="stat-value">
              {data.upcomingBookings?.length || 0}
            </div>
            <div className="stat-label">Upcoming</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon amber"><SettingsIcon /></div>
            <div className="stat-value">
              {data.business?.services?.length || 0}
            </div>
            <div className="stat-label">Active Services</div>
          </div>
        </div>

        {/* ---- CHARTS ---- */}
        <div className="grid grid-2" style={{ marginBottom: "1.5rem" }}>
          {/* Bookings Per Day Line Chart */}
          <div className="card">
            <div className="section-header">
              <div className="section-header-icon" style={{ background: "var(--info-light)", color: "var(--info)" }}><ActivityIcon /></div>
              <h3>Bookings Per Day (Last 30 Days)</h3>
            </div>
            <div style={{ width: "100%", height: 250, padding: "0.5rem 0" }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.bookingsPerDay || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatDateLabel}
                    tick={{ fontSize: 11 }}
                    interval="preserveStartEnd"
                    minTickGap={40}
                  />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip
                    labelFormatter={(label) => formatDateLabel(label)}
                    formatter={(value) => [value, "Bookings"]}
                  />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={{ r: 3, fill: "#3b82f6" }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Bookings by Status Bar Chart */}
          <div className="card">
            <div className="section-header">
              <div className="section-header-icon" style={{ background: "#f0eaf5", color: "#7a5a8f" }}><BarChartIcon /></div>
              <h3>Bookings by Status</h3>
            </div>
            <div style={{ width: "100%", height: 250, padding: "0.5rem 0" }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={statusChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(value) => [value, "Bookings"]} />
                  <Bar dataKey="count" name="Bookings" radius={[4, 4, 0, 0]}>
                    {/* Each bar gets its own color based on status */}
                    {statusChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* ---- LISTS ---- */}
        <div className="grid grid-2">
          {/* Upcoming Bookings */}
          <div className="card">
            <div className="section-header">
              <div className="section-header-icon" style={{ background: "var(--info-light)", color: "var(--info)" }}><UpcomingIcon /></div>
              <h3>Upcoming Bookings</h3>
            </div>
            {/* Empty state */}
            {data.upcomingBookings?.length === 0 && (
              <div className="empty-state">
                <div className="empty-state-icon"><CalendarIcon /></div>
                <h3>No upcoming bookings</h3>
                <p>New appointments will show up here</p>
              </div>
            )}
            {/* List of upcoming bookings */}
            {data.upcomingBookings?.map((b, i) => (
              <div key={b._id} className="list-item">
                <div className="list-item-info">
                  <div className={`list-item-avatar ${colors[i % colors.length]}`}>
                    {b.customerName?.charAt(0)?.toUpperCase()}
                  </div>
                  <div>
                    <div className="list-item-name">{b.customerName}</div>
                    <div className="list-item-meta">
                      {b.service} &middot;{" "}
                      {new Date(b.date).toLocaleDateString()} at {b.time}
                    </div>
                  </div>
                </div>
                <div className="list-item-actions">
                  <span className={`badge badge-${b.status}`}>{b.status}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Recent Activity */}
          <div className="card">
            <div className="section-header">
              <div className="section-header-icon" style={{ background: "#f0eaf5", color: "#7a5a8f" }}><ActivityIcon /></div>
              <h3>Recent Activity</h3>
            </div>
            {/* Empty state */}
            {data.recentBookings?.length === 0 && (
              <div className="empty-state">
                <div className="empty-state-icon"><ActivityIcon /></div>
                <h3>No activity yet</h3>
                <p>Recent bookings will appear here</p>
              </div>
            )}
            {/* List of recent bookings */}
            {data.recentBookings?.map((b, i) => (
              <div key={b._id} className="list-item">
                <div className="list-item-info">
                  <div className={`list-item-avatar ${colors[(i + 2) % colors.length]}`}>
                    {b.customerName?.charAt(0)?.toUpperCase()}
                  </div>
                  <div>
                    <div className="list-item-name">{b.customerName}</div>
                    <div className="list-item-meta">
                      {b.service} &middot;{" "}
                      {new Date(b.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                <div className="list-item-actions">
                  <span className={`badge badge-${b.status}`}>{b.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}