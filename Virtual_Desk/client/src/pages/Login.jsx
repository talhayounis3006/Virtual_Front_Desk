/**
 * ============================================================
 *  LOGIN PAGE — pages/Login.jsx
 * ============================================================
 *  The login page where users sign in to their account.
 *
 *  WHAT IT DOES:
 *  - Shows a form with email + password fields
 *  - Calls the login API on submit
 *  - Redirects to /dashboard on success
 *  - Shows an error message on failure
 *
 *  KEY CONCEPTS TO LEARN:
 *  1. Controlled inputs: form fields are bound to React state
 *  2. Form submission: handleSubmit prevents default browser behavior
 *  3. Loading state: disables the button while submitting
 *  4. Error handling: catches and displays API errors
 * ============================================================
 */

// React hooks
import { useState } from "react";
// React Router hooks
import { useNavigate, Link } from "react-router-dom";
// Auth context
import { useAuth } from "../context/AuthContext.jsx";

/* ---- SVG ICON COMPONENTS ---- */

// Building icon — logo
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

// Calendar icon — feature bullet
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

// Robot icon — feature bullet
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

// Star icon — feature bullet
function StarIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

/**
 * Login — the login page component.
 */
export default function Login() {
  // Form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  // Error message (shown if login fails)
  const [error, setError] = useState("");
  // True while the login request is in progress
  const [submitting, setSubmitting] = useState(false);
  // Get the login function from auth context
  const { login } = useAuth();
  // For redirecting after successful login
  const navigate = useNavigate();

  /**
   * handleSubmit — called when the form is submitted.
   * Prevents the default page reload, calls the login API,
   * and redirects to the dashboard on success.
   */
  const handleSubmit = async (e) => {
    e.preventDefault(); // don't reload the page
    setError("");       // clear any previous error
    setSubmitting(true); // show loading state

    try {
      await login(email, password); // call the auth context login
      navigate("/dashboard");       // redirect to the dashboard
    } catch (err) {
      setError(err.message); // show the error message
    } finally {
      setSubmitting(false); // always stop loading
    }
  };

  return (
    <div className="auth-layout">
      {/* Left panel: branding + features */}
      <div className="auth-left">
        <div className="auth-left-content">
          <div className="auth-logo"><LogoIcon /></div>
          <h2>Welcome back</h2>
          <p>
            Sign in to manage your bookings, view analytics, and grow your
            business with AI-powered customer support.
          </p>
          <div className="auth-features">
            <div className="auth-feature">
              <CalendarIcon />
              Smart booking management
            </div>
            <div className="auth-feature">
              <RobotIcon />
              AI assistant for your customers
            </div>
            <div className="auth-feature">
              <StarIcon />
              Automated review requests
            </div>
          </div>
        </div>
      </div>

      {/* Right panel: the login form */}
      <div className="auth-right">
        <div className="auth-form-container">
          <h2>Sign in to your account</h2>
          <p className="auth-subtitle">
            Enter your credentials to access your dashboard
          </p>

          {/* Error message (if any) */}
          {error && (
            <div className="auth-error">
              <span>⚠</span> {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Email field */}
            <div className="form-group">
              <label>Email address</label>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            {/* Password field */}
            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {/* Submit button — disabled while submitting */}
            <button
              className="btn btn-primary btn-lg"
              style={{ width: "100%", marginTop: "0.5rem" }}
              type="submit"
              disabled={submitting}
            >
              {submitting ? "Signing in..." : "Sign in"}
            </button>
          </form>

          {/* Link to register page */}
          <p className="auth-footer">
            Don't have an account?{" "}
            <Link to="/register">Create one for free</Link>
          </p>
        </div>
      </div>
    </div>
  );
}