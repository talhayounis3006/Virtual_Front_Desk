/**
 * ============================================================
 *  SETTINGS PAGE — pages/Settings.jsx
 * ============================================================
 *  The business owner's settings page for configuring hours and holidays.
 *
 *  WHAT IT DOES:
 *  - Displays a table of business hours (per day of the week)
 *  - Allows toggling days as "closed" (day off)
 *  - Manages blackout dates (holidays)
 *  - Saves all settings via the API
 *
 *  KEY CONCEPTS TO LEARN:
 *  1. State management: businessHours object + blackoutDates array
 *  2. handleHourChange: updates a specific day's open/close time
 *  3. isDayOff: checks if a day has no open/close times
 *  4. Save flow: sends the entire settings object to the API
 * ============================================================
 */

// React hooks
import { useState, useEffect } from "react";
// API helper
import { api } from "../services/api.js";

// Days of the week (in order)
const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

// Display labels for each day
const DAY_LABELS = {
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
  saturday: "Saturday",
  sunday: "Sunday",
};

// Default business hours (used when no settings exist)
const defaultHours = {
  monday: { open: "09:00", close: "18:00" },
  tuesday: { open: "09:00", close: "18:00" },
  wednesday: { open: "09:00", close: "18:00" },
  thursday: { open: "09:00", close: "18:00" },
  friday: { open: "09:00", close: "18:00" },
  saturday: { open: "09:00", close: "17:00" },
  sunday: { open: "", close: "" }, // closed on Sunday
};

/**
 * Settings — the business settings page.
 */
export default function Settings() {
  // Business hours state (initialized with defaults)
  const [businessHours, setBusinessHours] = useState(defaultHours);
  // Blackout dates (holidays)
  const [blackoutDates, setBlackoutDates] = useState([]);
  // New blackout date form
  const [newBlackoutDate, setNewBlackoutDate] = useState("");
  const [newBlackoutReason, setNewBlackoutReason] = useState("");
  // UI states
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Load settings on component mount
  useEffect(() => {
    api.settings
      .get() // GET /api/settings
      .then((settings) => {
        if (settings.businessHours) {
          setBusinessHours(settings.businessHours);
        }
        if (settings.blackoutDates) {
          // Convert dates to "YYYY-MM-DD" format for the date input
          setBlackoutDates(
            settings.blackoutDates.map((bd) => ({
              _id: bd._id,
              date: new Date(bd.date).toISOString().split("T")[0],
              reason: bd.reason || "",
            }))
          );
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  /**
   * handleHourChange — updates the open/close time for a specific day.
   */
  const handleHourChange = (day, field, value) => {
    setBusinessHours((prev) => ({
      ...prev,
      [day]: { ...prev[day], [field]: value },
    }));
  };

  /**
   * isDayOff — returns true if a day has no open/close times (closed).
   */
  const isDayOff = (day) => {
    const h = businessHours[day];
    return !h || !h.open || !h.close;
  };

  /**
   * addBlackoutDate — adds a new blackout date to the list.
   */
  const addBlackoutDate = () => {
    if (!newBlackoutDate) return;
    setBlackoutDates((prev) => [
      ...prev,
      { _id: Date.now().toString(), date: newBlackoutDate, reason: newBlackoutReason },
    ]);
    // Clear the form
    setNewBlackoutDate("");
    setNewBlackoutReason("");
  };

  /**
   * removeBlackoutDate — removes a blackout date from the list.
   */
  const removeBlackoutDate = (id) => {
    setBlackoutDates((prev) => prev.filter((bd) => bd._id !== id));
  };

  /**
   * handleSave — saves all settings to the API.
   */
  const handleSave = async () => {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      // PUT /api/settings with the current state
      await api.settings.update({
        businessHours,
        blackoutDates: blackoutDates.map((bd) => ({
          date: bd.date,
          reason: bd.reason,
        })),
      });
      setSuccess("Settings saved successfully!");
      // Clear the success message after 3 seconds
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Loading state
  if (loading)
    return (
      <div className="loading-page">
        <div className="loading-spinner" /> Loading settings...
      </div>
    );

  return (
    <div>
      {/* Page header */}
      <div className="page-header">
        <h1>Settings</h1>
        <p className="page-subtitle">Configure business hours, holidays, and service defaults</p>
      </div>

      <div className="page-body">
        {/* Error/success messages */}
        {error && (
          <div className="auth-error" style={{ marginBottom: "1rem" }}>
            <span>⚠️</span> {error}
          </div>
        )}
        {success && (
          <div className="auth-success" style={{ marginBottom: "1rem", color: "var(--success)", background: "var(--success-light)", padding: "0.75rem 1rem", borderRadius: 8 }}>
            {success}
          </div>
        )}

        {/* ---- BUSINESS HOURS TABLE ---- */}
        <div className="card" style={{ marginBottom: "1.5rem" }}>
          <div className="section-header">
            <h3>Business Hours</h3>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left", padding: "0.5rem 1rem", borderBottom: "1px solid var(--border)" }}>Day</th>
                  <th style={{ textAlign: "left", padding: "0.5rem 1rem", borderBottom: "1px solid var(--border)" }}>Open</th>
                  <th style={{ textAlign: "left", padding: "0.5rem 1rem", borderBottom: "1px solid var(--border)" }}>Close</th>
                  <th style={{ textAlign: "left", padding: "0.5rem 1rem", borderBottom: "1px solid var(--border)" }}>Day Off</th>
                </tr>
              </thead>
              <tbody>
                {/* One row per day */}
                {DAYS.map((day) => (
                  <tr key={day}>
                    <td style={{ padding: "0.5rem 1rem", borderBottom: "1px solid var(--border)", fontWeight: 500 }}>
                      {DAY_LABELS[day]}
                    </td>
                    {/* Open time input */}
                    <td style={{ padding: "0.5rem 1rem", borderBottom: "1px solid var(--border)" }}>
                      <input
                        type="time"
                        value={businessHours[day]?.open || ""}
                        onChange={(e) => handleHourChange(day, "open", e.target.value)}
                        disabled={!businessHours[day]?.open && businessHours[day]?.open !== "" ? false : undefined}
                        style={{ width: 120 }}
                      />
                    </td>
                    {/* Close time input */}
                    <td style={{ padding: "0.5rem 1rem", borderBottom: "1px solid var(--border)" }}>
                      <input
                        type="time"
                        value={businessHours[day]?.close || ""}
                        onChange={(e) => handleHourChange(day, "close", e.target.value)}
                        disabled={!businessHours[day]?.close && businessHours[day]?.close !== "" ? false : undefined}
                        style={{ width: 120 }}
                      />
                    </td>
                    {/* Day off checkbox */}
                    <td style={{ padding: "0.5rem 1rem", borderBottom: "1px solid var(--border)" }}>
                      <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
                        <input
                          type="checkbox"
                          checked={isDayOff(day)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              // Mark as closed: clear open/close times
                              handleHourChange(day, "open", "");
                              handleHourChange(day, "close", "");
                            } else {
                              // Reopen: restore default hours
                              handleHourChange(day, "open", defaultHours[day]?.open || "09:00");
                              handleHourChange(day, "close", defaultHours[day]?.close || "18:00");
                            }
                          }}
                        />
                        Closed
                      </label>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ---- BLACKOUT DATES ---- */}
        <div className="card" style={{ marginBottom: "1.5rem" }}>
          <div className="section-header">
            <h3>Blackout Dates / Holidays</h3>
          </div>

          {/* Add new blackout date form */}
          <div className="form-group">
            <div style={{ display: "flex", gap: "0.75rem", alignItems: "flex-end" }}>
              <div style={{ flex: 1 }}>
                <label>Date</label>
                <input
                  type="date"
                  value={newBlackoutDate}
                  onChange={(e) => setNewBlackoutDate(e.target.value)}
                />
              </div>
              <div style={{ flex: 2 }}>
                <label>Reason (optional)</label>
                <input
                  type="text"
                  value={newBlackoutReason}
                  onChange={(e) => setNewBlackoutReason(e.target.value)}
                  placeholder="e.g. Christmas Day"
                />
              </div>
              <button className="btn btn-primary" onClick={addBlackoutDate} disabled={!newBlackoutDate}>
                Add
              </button>
            </div>
          </div>

          {/* Empty state */}
          {blackoutDates.length === 0 && (
            <div className="empty-state" style={{ padding: "1.5rem" }}>
              <p>No blackout dates configured</p>
            </div>
          )}

          {/* List of blackout dates */}
          {blackoutDates.map((bd) => (
            <div key={bd._id} className="list-item">
              <div className="list-item-info">
                <div>
                  <div className="list-item-name">
                    {new Date(bd.date + "T00:00:00").toLocaleDateString("en-US", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </div>
                  {bd.reason && <div className="list-item-meta">{bd.reason}</div>}
                </div>
              </div>
              <div className="list-item-actions">
                <button
                  className="btn btn-danger btn-sm"
                  onClick={() => removeBlackoutDate(bd._id)}
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* ---- SERVICE DEFAULTS INFO ---- */}
        <div className="card" style={{ marginBottom: "1.5rem" }}>
          <div className="section-header">
            <h3>Service Duration Defaults</h3>
          </div>
          <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
            Each service already has its own duration configured on the{" "}
            <a href="/services" style={{ color: "var(--primary)" }}>Services page</a>.
            The booking system uses those per-service durations when creating appointments.
          </p>
        </div>

        {/* Save button */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "1rem" }}>
          <button className="btn btn-primary btn-lg" onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save Settings"}
          </button>
        </div>
      </div>

      {/* Scoped CSS for the success message */}
      <style>{`
        .auth-success {
          padding: 0.75rem 1rem;
          border-radius: 8px;
          color: var(--success);
          background: var(--success-light, #dcfce7);
        }
      `}</style>
    </div>
  );
}