/**
 * ============================================================
 *  REGISTER PAGE — pages/Register.jsx
 * ============================================================
 *  The registration page where new business owners create an account.
 *
 *  WHAT IT DOES:
 *  - Shows a form with name, email, password, business name, and category
 *  - Calls the register API on submit (creates user + business)
 *  - Redirects to /dashboard on success
 *  - Shows an error message on failure
 *
 *  KEY CONCEPTS TO LEARN:
 *  1. Form state as an object: one `form` state object for all fields
 *  2. handleChange: a single handler for all inputs using `name` attribute
 *  3. Controlled select: the category dropdown is bound to state
 *  4. Registration flow: creates both a User AND a Business on the server
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

// Checkmark icon — feature bullet
function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

// Lightning bolt icon — feature bullet
function ZapIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}

// Trending up icon — feature bullet
function TrendingIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
    </svg>
  );
}

// Shield icon — feature bullet
function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

/**
 * Register — the registration page component.
 */
export default function Register() {
  // Form state — one object for all fields
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    businessName: "",
    category: "salon", // default category
  });
  // Error message (shown if registration fails)
  const [error, setError] = useState("");
  // True while the registration request is in progress
  const [submitting, setSubmitting] = useState(false);
  // Get the register function from auth context
  const { register } = useAuth();
  // For redirecting after successful registration
  const navigate = useNavigate();

  /**
   * handleChange — a single handler for all form inputs.
   * Uses the input's `name` attribute to update the correct field.
   */
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  /**
   * handleSubmit — called when the form is submitted.
   * Creates the account (user + business) and redirects to the dashboard.
   */
  const handleSubmit = async (e) => {
    e.preventDefault(); // don't reload the page
    setError("");       // clear any previous error
    setSubmitting(true); // show loading state

    try {
      // Register with role "owner" (this creates a business too)
      await register({ ...form, role: "owner" });
      navigate("/dashboard"); // redirect to the dashboard
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
          <h2>Start your free trial</h2>
          <p>
            Set up your virtual front desk in under 5 minutes. No credit card
            required.
          </p>
          <div className="auth-features">
            <div className="auth-feature">
              <CheckIcon />
              14-day free trial, no card needed
            </div>
            <div className="auth-feature">
              <ZapIcon />
              AI handles customer inquiries 24/7
            </div>
            <div className="auth-feature">
              <TrendingIcon />
              Increase bookings by up to 40%
            </div>
            <div className="auth-feature">
              <ShieldIcon />
              Enterprise-grade security
            </div>
          </div>
        </div>
      </div>

      {/* Right panel: the registration form */}
      <div className="auth-right">
        <div className="auth-form-container">
          <h2>Create your account</h2>
          <p className="auth-subtitle">
            Get started with your AI-powered front desk
          </p>

          {/* Error message (if any) */}
          {error && (
            <div className="auth-error">
              <span>⚠</span> {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Full name */}
            <div className="form-group">
              <label>Full name</label>
              <input
                name="name"
                placeholder="John Smith"
                value={form.name}
                onChange={handleChange}
                required
              />
            </div>

            {/* Email */}
            <div className="form-group">
              <label>Email address</label>
              <input
                name="email"
                type="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={handleChange}
                required
              />
            </div>

            {/* Password */}
            <div className="form-group">
              <label>Password</label>
              <input
                name="password"
                type="password"
                placeholder="Min 6 characters"
                value={form.password}
                onChange={handleChange}
                required
                minLength={6}
              />
            </div>

            {/* Business name */}
            <div className="form-group">
              <label>Business name</label>
              <input
                name="businessName"
                placeholder="e.g. Glow Salon"
                value={form.businessName}
                onChange={handleChange}
                required
              />
            </div>

            {/* Business category dropdown */}
            <div className="form-group">
              <label>Business category</label>
              <select
                name="category"
                value={form.category}
                onChange={handleChange}
              >
                <option value="salon">Salon / Spa</option>
                <option value="clinic">Clinic / Medical</option>
                <option value="gym">Gym / Fitness</option>
                <option value="tutoring">Tutoring / Education</option>
                <option value="agency">Agency / Studio</option>
                <option value="other">Other</option>
              </select>
            </div>

            {/* Submit button — disabled while submitting */}
            <button
              className="btn btn-primary btn-lg"
              style={{ width: "100%", marginTop: "0.5rem" }}
              type="submit"
              disabled={submitting}
            >
              {submitting ? "Creating account..." : "Create account"}
            </button>
          </form>

          {/* Link to login page */}
          <p className="auth-footer">
            Already have an account? <Link to="/login">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}