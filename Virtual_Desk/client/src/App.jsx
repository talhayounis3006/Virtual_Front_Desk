/**
 * ============================================================
 *  ROOT APP COMPONENT — App.jsx
 * ============================================================
 *  The main application component that sets up routing.
 *
 *  WHAT IT DOES:
 *  1. Sets up React Router (BrowserRouter) for client-side navigation
 *  2. Wraps everything in AuthProvider (global auth state)
 *  3. Defines all routes and which components they render
 *  4. Defines route protection wrappers (OwnerRoute, PublicRoute)
 *  5. Contains the landing page (hero section) markup
 *
 *  KEY CONCEPTS TO LEARN:
 *  - React Router: <Routes> and <Route> define URL → component mappings
 *  - Route Guards: OwnerRoute redirects customers away from owner pages
 *  - Context Provider: AuthProvider makes auth state available everywhere
 *  - Nested Layouts: OwnerRoute renders Sidebar + Navbar + content
 * ============================================================
 */

// React Router imports for navigation
import { BrowserRouter, Routes, Route, Navigate, Link } from "react-router-dom";
// Auth context — provides user state and login/logout functions
import { AuthProvider, useAuth } from "./context/AuthContext.jsx";
// Layout components
import Sidebar from "./components/Sidebar.jsx";           // left sidebar for dashboard
import Navbar from "./components/Navbar.jsx";             // top nav for public pages
import DashboardNavbar from "./components/DashboardNavbar.jsx"; // top nav for dashboard
// Page components
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Bookings from "./pages/Bookings.jsx";
import Services from "./pages/Services.jsx";
import ChatLogs from "./pages/ChatLogs.jsx";
import Settings from "./pages/Settings.jsx";
import PublicBooking from "./pages/PublicBooking.jsx";
import BookingSuccess from "./pages/BookingSuccess.jsx";

/* ============================================================
 *  SVG ICON COMPONENTS
 *  Small inline SVG icons used on the landing page.
 *  They're defined as components so they can be reused.
 * ============================================================ */

// Building icon — represents the "front desk" concept
function BuildingIcon() {
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

// Robot icon — represents the AI assistant
function RobotIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="10" rx="2" />
      <circle cx="12" cy="5" r="2" />
      <path d="M12 7v4" />
      <path d="M8 16h.01" />
      <path d="M12 16h.01" />
      <path d="M16 16h.01" />
    </svg>
  );
}

// Calendar icon — represents booking
function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4" />
      <path d="M8 2v4" />
      <path d="M3 10h18" />
    </svg>
  );
}

// Chat icon — represents the chat feature
function ChatIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

/* ============================================================
 *  ROUTE WRAPPERS (Route Guards)
 *  These components wrap page content to control access.
 * ============================================================ */

/**
 * OwnerRoute — protects owner/staff dashboard pages.
 * - If still loading auth state → show loading spinner
 * - If user is not logged in OR is a customer → redirect to home
 * - Otherwise → render the dashboard layout (Sidebar + Navbar + content)
 */
function OwnerRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading)
    return (
      <div className="loading-page">
        <div className="loading-spinner" /> Loading...
      </div>
    );
  if (!user || user.role === "customer") return <Navigate to="/" />;
  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-with-navbar">
        <DashboardNavbar />
        <main className="main-content">{children}</main>
      </div>
    </div>
  );
}

/**
 * PublicRoute — wraps public pages (booking page, landing page).
 * - Shows loading spinner while auth state is being determined
 * - Renders the public Navbar + the page content
 */
function PublicRoute({ children }) {
  const { loading } = useAuth();
  if (loading)
    return (
      <div className="loading-page">
        <div className="loading-spinner" /> Loading...
      </div>
    );
  return (
    <>
      <Navbar />
      {children}
    </>
  );
}

/**
 * AppRoutes — defines all the routes in the application.
 * Each <Route> maps a URL path to a component.
 */
function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      {/* Login page — redirect to dashboard if already logged in */}
      <Route
        path="/login"
        element={user ? <Navigate to="/dashboard" /> : <Login />}
      />
      {/* Register page — redirect to dashboard if already logged in */}
      <Route
        path="/register"
        element={user ? <Navigate to="/dashboard" /> : <Register />}
      />
      {/* Public booking page: /book/glamour-studio */}
      <Route
        path="/book/:slug"
        element={
          <PublicRoute>
            <PublicBooking />
          </PublicRoute>
        }
      />
      {/* Booking success page (after Stripe payment) */}
      <Route
        path="/book/success"
        element={
          <PublicRoute>
            <BookingSuccess />
          </PublicRoute>
        }
      />
      {/* Dashboard — owner/staff only */}
      <Route
        path="/dashboard"
        element={
          <OwnerRoute>
            <Dashboard />
          </OwnerRoute>
        }
      />
      {/* Bookings management — owner/staff only */}
      <Route
        path="/bookings"
        element={
          <OwnerRoute>
            <Bookings />
          </OwnerRoute>
        }
      />
      {/* Services management — owner/staff only */}
      <Route
        path="/services"
        element={
          <OwnerRoute>
            <Services />
          </OwnerRoute>
        }
      />
      {/* AI chat logs — owner/staff only */}
      <Route
        path="/chat-logs"
        element={
          <OwnerRoute>
            <ChatLogs />
          </OwnerRoute>
        }
      />
      {/* Settings — owner/staff only */}
      <Route
        path="/settings"
        element={
          <OwnerRoute>
            <Settings />
          </OwnerRoute>
        }
      />
      {/* Landing page (home) — public */}
      <Route
        path="/"
        element={
          <PublicRoute>
            <main className="landing-page">
              <section className="landing-hero">
                <div className="landing-copy">
                  <div className="eyebrow"><span /> Built for appointment-based teams</div>
                  <h1>Make every <em>first impression</em> count.</h1>
                  <p>
                    FrontDesk brings bookings, conversations, and follow-ups into one calm,
                    dependable workspace—so your team can focus on people, not admin.
                  </p>
                  <div className="landing-actions">
                    <Link to="/register" className="btn btn-accent btn-lg">Create your workspace <span>→</span></Link>
                    <Link to="/login" className="landing-text-link">See your dashboard <span>→</span></Link>
                  </div>
                  <div className="landing-proof">
                    <div className="avatar-stack"><i>J</i><i>M</i><i>A</i></div>
                    <span>Designed for service teams who care about the details.</span>
                  </div>
                </div>
                <div className="product-frame" aria-label="FrontDesk dashboard preview">
                  <div className="preview-topbar"><span className="preview-mark"><BuildingIcon /></span><b>Studio North</b><small>Tuesday, 12 March</small><i /></div>
                  <div className="preview-body">
                    <aside><span className="active">Overview</span><span>Calendar</span><span>Clients</span><span>Messages</span></aside>
                    <div className="preview-content">
                      <div className="preview-heading"><div><small>GOOD MORNING, MAYA</small><strong>Your day, at a glance.</strong></div><button>+ New booking</button></div>
                      <div className="preview-stats"><div><small>TODAY'S BOOKINGS</small><b>12</b><span>+3 from yesterday</span></div><div><small>OPEN CONVERSATIONS</small><b>04</b><span>All replied within 8 min</span></div></div>
                      <div className="preview-list"><div className="preview-list-title"><b>Up next</b><span>View calendar →</span></div><div className="appointment"><time>09:30<small>AM</small></time><span className="appointment-avatar">LM</span><div><b>Leah Martin</b><small>Signature facial · 60 min</small></div><em>Confirmed</em></div><div className="appointment"><time>11:00<small>AM</small></time><span className="appointment-avatar warm">CR</span><div><b>Camille Ross</b><small>Consultation · 30 min</small></div><em>Confirmed</em></div></div>
                    </div>
                  </div>
                </div>
              </section>
              <section className="landing-value">
                <div><span className="section-index">01 — THE ESSENTIALS</span><h2>A front desk that keeps moving when you can’t.</h2></div>
                <div className="value-grid">
                  <article><div className="feature-icon"><CalendarIcon /></div><h3>Bookings with context</h3><p>Clear availability, thoughtful confirmations, and an appointment history your team can trust.</p></article>
                  <article><div className="feature-icon"><ChatIcon /></div><h3>Conversations, handled</h3><p>Give guests timely answers while keeping every interaction visible to your team.</p></article>
                  <article><div className="feature-icon"><RobotIcon /></div><h3>Automation with restraint</h3><p>Use AI and reminders where they help—without making your customer experience feel robotic.</p></article>
                </div>
              </section>
            </main>
          </PublicRoute>
        }
      />
    </Routes>
  );
}

/**
 * App — the root component.
 * Wraps everything in BrowserRouter (for routing) and AuthProvider
 * (for global authentication state).
 */
export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
