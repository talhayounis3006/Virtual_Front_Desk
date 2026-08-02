/**
 * ============================================================
 *  SIDEBAR — components/Sidebar.jsx
 * ============================================================
 *  The left sidebar navigation for the business dashboard.
 *
 *  WHAT IT CONTAINS:
 *  - FrontDesk brand/logo
 *  - Navigation links: Dashboard, Bookings, Services, AI Chat Logs, Settings
 *  - User info (avatar with initials, name, role)
 *  - Sign out button
 *
 *  KEY CONCEPTS TO LEARN:
 *  1. useLocation: determines which nav link is "active" (highlighted)
 *  2. Conditional rendering: hides the sidebar for customer users
 *  3. Avatar initials: computed from the user's name
 *  4. ownerLinks array: data-driven navigation (map over an array)
 * ============================================================
 */

// React Router hooks
import { Link, useLocation, useNavigate } from "react-router-dom";
// Auth context
import { useAuth } from "../context/AuthContext.jsx";

/* ---- SVG ICON COMPONENTS ---- */

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

// Grid icon — dashboard
function DashboardIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}

// Calendar icon — bookings
function BookingsIcon() {
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

// Gear icon — services
function ServicesIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

// Chat bubble icon — AI chat logs
function ChatIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
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

// Navigation links for owner/staff users
// Each link has: URL path, label, and icon component
const ownerLinks = [
  { to: "/dashboard", label: "Dashboard", icon: DashboardIcon },
  { to: "/bookings", label: "Bookings", icon: BookingsIcon },
  { to: "/services", label: "Services", icon: ServicesIcon },
  { to: "/chat-logs", label: "AI Chat Logs", icon: ChatIcon },
  { to: "/settings", label: "Settings", icon: SettingsIcon },
];

/**
 * Sidebar — the left navigation for the business dashboard.
 * Rendered by OwnerRoute in App.jsx.
 */
export default function Sidebar() {
  // Auth state
  const { user, logout } = useAuth();
  // Current URL path (to highlight the active link)
  const location = useLocation();
  // Programmatic navigation
  const navigate = useNavigate();

  // Hide the sidebar for customer users (they don't have a dashboard)
  if (!user || user.role === "customer") return null;

  /**
   * handleLogout — logs out and redirects to the login page.
   */
  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  // Compute the user's initials for the avatar
  // "John Smith" → "JS"
  const initials = user.name
    .split(" ")          // ["John", "Smith"]
    .map((n) => n[0])    // ["J", "S"]
    .join("")            // "JS"
    .toUpperCase()       // "JS"
    .slice(0, 2);        // max 2 characters

  return (
    <aside className="sidebar">
      {/* Brand/logo */}
      <div className="sidebar-brand">
        <h1>
          <LogoIcon />
          <div>
            FrontDesk
            <div className="brand-sub">Business Dashboard</div>
          </div>
        </h1>
      </div>

      {/* Navigation links */}
      <nav className="sidebar-nav">
        <div className="sidebar-section">Main</div>
        {ownerLinks.map((link) => {
          const Icon = link.icon;
          return (
            <Link
              key={link.to}
              to={link.to}
              // Add "active" class if this link matches the current URL
              className={`sidebar-link ${location.pathname === link.to ? "active" : ""}`}
            >
              <Icon />
              <span>{link.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer: user info + sign out */}
      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="sidebar-avatar">{initials}</div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">{user.name}</div>
            <div className="sidebar-user-role">{user.role}</div>
          </div>
        </div>
        <button className="sidebar-logout" onClick={handleLogout}>
          Sign out
        </button>
      </div>
    </aside>
  );
}