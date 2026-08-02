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
import ImageSlider from "./components/ImageSlider.jsx";

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

// Star icon — represents reviews
function StarIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
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
            <div className="hero-section">
              <div className="hero-pattern" />
              <div className="hero-content">
                <div className="reception-desk">
                  <div className="reception-counter">
                    <div className="reception-badge">✦ AI-Powered Reception</div>
                    <div className="reception-icon">
                      <BuildingIcon />
                    </div>
                    <h1 className="reception-title">
                      Welcome to Your<br />
                      <span className="text-gradient">Virtual Front Desk</span>
                    </h1>
                    <p className="reception-subtitle">
                      AI-powered booking and customer support platform for local
                      service businesses. Open 24/7, never miss a customer.
                    </p>
                    <div className="reception-actions">
                      <Link to="/register" className="btn btn-accent btn-lg">
                        Start Free Trial
                      </Link>
                      <Link to="/login" className="btn btn-secondary btn-lg">
                        Sign In
                      </Link>
                    </div>
                  </div>
                  <ImageSlider />
                  <div className="reception-features">
                    <div className="feature-card">
                      <div className="feature-icon"><RobotIcon /></div>
                      <h3>AI Assistant</h3>
                      <p>Handles customer inquiries 24/7, books appointments automatically</p>
                    </div>
                    <div className="feature-card">
                      <div className="feature-icon"><CalendarIcon /></div>
                      <h3>Smart Booking</h3>
                      <p>Online booking with real-time availability and calendar sync</p>
                    </div>
                    <div className="feature-card">
                      <div className="feature-icon"><ChatIcon /></div>
                      <h3>Chat Logs</h3>
                      <p>Review all AI-customer conversations and captured leads</p>
                    </div>
                    <div className="feature-card">
                      <div className="feature-icon"><StarIcon /></div>
                      <h3>Review Automation</h3>
                      <p>Automatically request reviews after completed appointments</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
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