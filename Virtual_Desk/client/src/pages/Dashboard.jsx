import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../services/api.js";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell, Legend,
} from "recharts";

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

function BarChartIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 20V10" />
      <path d="M12 20V4" />
      <path d="M6 20v-6" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

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

function ActivityIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  );
}

const STATUS_COLORS = {
  confirmed: "#3b82f6",
  completed: "#22c55e",
  cancelled: "#ef4444",
  "no-show": "#f59e0b",
  pending: "#8b5cf6",
};

function formatDateLabel(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api.dashboard
      .getStats()
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading)
    return (
      <div className="loading-page">
        <div className="loading-spinner" /> Loading dashboard...
      </div>
    );
  if (error)
    return (
      <div className="loading-page" style={{ color: "var(--danger)" }}>
        {error}
      </div>
    );
  if (!data)
    return (
      <div className="loading-page">Could not load dashboard. Try again.</div>
    );

  const colors = ["blue", "green", "purple", "amber"];

  // Build status chart data
  const statusChartData = Object.entries(data.bookingsByStatus || {}).map(([status, count]) => ({
    name: status.charAt(0).toUpperCase() + status.slice(1),
    count,
    fill: STATUS_COLORS[status] || "#6b7280",
  }));

  return (
    <div>
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
                    {statusChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="grid grid-2">
          <div className="card">
            <div className="section-header">
              <div className="section-header-icon" style={{ background: "var(--info-light)", color: "var(--info)" }}><UpcomingIcon /></div>
              <h3>Upcoming Bookings</h3>
            </div>
            {data.upcomingBookings?.length === 0 && (
              <div className="empty-state">
                <div className="empty-state-icon"><CalendarIcon /></div>
                <h3>No upcoming bookings</h3>
                <p>New appointments will show up here</p>
              </div>
            )}
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

          <div className="card">
            <div className="section-header">
              <div className="section-header-icon" style={{ background: "#f0eaf5", color: "#7a5a8f" }}><ActivityIcon /></div>
              <h3>Recent Activity</h3>
            </div>
            {data.recentBookings?.length === 0 && (
              <div className="empty-state">
                <div className="empty-state-icon"><ActivityIcon /></div>
                <h3>No activity yet</h3>
                <p>Recent bookings will appear here</p>
              </div>
            )}
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