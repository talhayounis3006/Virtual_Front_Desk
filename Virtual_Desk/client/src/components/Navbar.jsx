/**
 * ============================================================
 *  NAVBAR — components/Navbar.jsx
 * ============================================================
 *  The top navigation bar shown on PUBLIC pages (landing, booking, login).
 *
 *  WHAT IT DOES:
 *  - Shows the FrontDesk logo/brand
 *  - If logged in as a customer: shows their name + sign out button
 *  - If not logged in: shows "Log in" and "Get Started" links
 *  - Hides itself for owner/staff users (they use the Sidebar instead)
 *
 *  KEY CONCEPTS TO LEARN:
 *  - Conditional rendering: different UI based on auth state
 *  - useAuth hook: accesses the global auth context
 *  - useNavigate: programmatic navigation (redirect after logout)
 * ============================================================
 */

// React Router hooks
import { Link, useNavigate } from "react-router-dom";
// Auth context
import { useAuth } from "../context/AuthContext.jsx";

/* ---- SVG ICON COMPONENT ---- */

// Building icon — the FrontDesk logo
function LogoIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 21h18" />
      <path d="M3 10h18" />
      <path d="M5 6l7-3 7 3" />
      <path d="M4 10v11" />
      <path d="M20 10v11" />
      <rect x="7" y="13" width="3" height="8" rx="1" />
      <rect x="14" y="13" width="3" height="8" rx="1" />
    </svg>
  );
}

/**
 * Navbar — the public top navigation bar.
 */
export default function Navbar() {
  // Get the current user and logout function from auth context
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Owner/staff users don't see this navbar — they use the Sidebar layout
  if (user && user.role !== "customer") return null;

  /**
   * handleLogout — logs out and redirects to the login page.
   */
  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <nav className="top-nav">
      {/* Brand/logo link to home */}
      <Link to="/" className="top-nav-brand">
        <LogoIcon />
        FrontDesk
      </Link>

      {/* Right side: auth-dependent links */}
      <div className="top-nav-links">
        {user ? (
          // Logged in as customer
          <>
            {user.role === "customer" && (
              <Link to="/dashboard">Dashboard</Link>
            )}
            <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
              {user.name}
            </span>
            <button className="btn btn-ghost btn-sm" onClick={handleLogout}>
              Sign out
            </button>
          </>
        ) : (
          // Not logged in
          <>
            <Link to="/login">Log in</Link>
            <Link to="/register" className="btn btn-primary btn-sm">
              Get Started
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}