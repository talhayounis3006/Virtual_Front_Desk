import { BrowserRouter, Routes, Route, Navigate, Link } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext.jsx";
import Sidebar from "./components/Sidebar.jsx";
import Navbar from "./components/Navbar.jsx";
import DashboardNavbar from "./components/DashboardNavbar.jsx";
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

/* ---- SVG Icons ---- */
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

function ChatIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function StarIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

/* ---- Route Wrappers ---- */
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

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route
        path="/login"
        element={user ? <Navigate to="/dashboard" /> : <Login />}
      />
      <Route
        path="/register"
        element={user ? <Navigate to="/dashboard" /> : <Register />}
      />
      <Route
        path="/book/:slug"
        element={
          <PublicRoute>
            <PublicBooking />
          </PublicRoute>
        }
      />
      <Route
        path="/book/success"
        element={
          <PublicRoute>
            <BookingSuccess />
          </PublicRoute>
        }
      />
      <Route
        path="/dashboard"
        element={
          <OwnerRoute>
            <Dashboard />
          </OwnerRoute>
        }
      />
      <Route
        path="/bookings"
        element={
          <OwnerRoute>
            <Bookings />
          </OwnerRoute>
        }
      />
      <Route
        path="/services"
        element={
          <OwnerRoute>
            <Services />
          </OwnerRoute>
        }
      />
      <Route
        path="/chat-logs"
        element={
          <OwnerRoute>
            <ChatLogs />
          </OwnerRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <OwnerRoute>
            <Settings />
          </OwnerRoute>
        }
      />
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

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}