/**
 * ============================================================
 *  DASHBOARD NAVBAR — components/DashboardNavbar.jsx
 * ============================================================
 *  The top navigation bar shown on the business dashboard pages.
 *
 *  WHAT IT CONTAINS:
 *  - Search bar (left)
 *  - Current page title + date (center)
 *  - Action buttons: notifications, settings, help (right)
 *  - "New reservation" button
 *
 *  KEY CONCEPTS TO LEARN:
 *  - This is a presentational component (no state, no API calls)
 *  - Inline SVG icons are defined as small components
 *  - Uses `new Date().toLocaleDateString()` to show today's date
 * ============================================================
 */

// React (needed for JSX)
import React from "react";
// Link: for client-side navigation
import { Link } from "react-router-dom";

/* ---- SVG ICON COMPONENTS ---- */

// Bell icon — notifications
function BellIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

// Gear icon — settings
function SettingsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

// Question mark icon — help
function HelpIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <path d="M12 17h.01" />
    </svg>
  );
}

/**
 * DashboardNavbar — the top bar for the dashboard layout.
 * Rendered by OwnerRoute in App.jsx.
 */
export default function DashboardNavbar() {
  return (
    <nav className="dashboard-navbar">
      {/* Left: search bar */}
      <div className="dashboard-navbar-left">
        <div className="search-bar">
          <input type="text" placeholder="Search..." />
        </div>
      </div>

      {/* Center: current page title + today's date */}
      <div className="dashboard-navbar-center">
        <span className="current-page-title">Daily Operation / Dashboard</span>
        <span className="current-date">
          Today | {new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
        </span>
      </div>

      {/* Right: action buttons */}
      <div className="dashboard-navbar-right">
        <button className="icon-button"><BellIcon /></button>
        <button className="icon-button"><SettingsIcon /></button>
        <button className="icon-button"><HelpIcon /></button>
        <Link to="/new-reservation" className="btn btn-primary">
          + New reservation
        </Link>
      </div>
    </nav>
  );
}