/**
 * ============================================================
 *  BOOKING SUCCESS PAGE — pages/BookingSuccess.jsx
 * ============================================================
 *  The confirmation page shown after a customer completes payment.
 *  Accessible at: /book/success?session_id=xxx
 *
 *  WHAT IT DOES:
 *  - Reads the Stripe session_id from the URL query params
 *  - Fetches the booking details from the API
 *  - Displays a confirmation with booking summary
 *
 *  KEY CONCEPTS TO LEARN:
 *  1. useSearchParams: reads query parameters from the URL
 *  2. Conditional rendering: loading → error → success states
 *  3. The session_id is how we know WHICH booking to show
 * ============================================================
 */

// React hooks
import { useState, useEffect } from "react";
// React Router hooks
import { useSearchParams, Link } from "react-router-dom";
// API helper
import { api } from "../services/api.js";

function ConfirmationIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="m8 12 2.5 2.5L16 9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * BookingSuccess — the payment confirmation page.
 */
export default function BookingSuccess() {
  // Read the session_id from the URL: /book/success?session_id=cs_test_xxx
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id");

  // The booking details (fetched from the API)
  const [booking, setBooking] = useState(null);
  // Loading state
  const [loading, setLoading] = useState(true);
  // Error message
  const [error, setError] = useState("");

  // Fetch the booking when the component mounts
  useEffect(() => {
    // No session ID in the URL → can't look up the booking
    if (!sessionId) {
      setError("No session ID provided");
      setLoading(false);
      return;
    }

    // GET /api/payments/session/:sessionId
    api.payments
      .getSession(sessionId)
      .then(setBooking)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [sessionId]);

  // Loading state
  if (loading)
    return (
      <div className="loading-page">
        <div className="loading-spinner" /> Verifying payment...
      </div>
    );

  // Error state — show a generic success message with the error
  if (error)
    return (
      <div style={{ padding: "4rem 1rem", textAlign: "center" }}>
        <div className="booking-form-wrapper">
          <div className="booking-form-card">
            <div className="booking-success">
              <div className="booking-success-icon"><ConfirmationIcon /></div>
              <h2>Payment received</h2>
              <p>Your payment was processed successfully. If you don't see your booking details below, please contact the business.</p>
              {error && <p style={{ color: "var(--danger)", marginTop: "0.5rem" }}>{error}</p>}
              <Link to="/" className="btn btn-primary" style={{ marginTop: "1.5rem", display: "inline-block" }}>
                Return Home
              </Link>
            </div>
          </div>
        </div>
      </div>
    );

  // Success state — show the booking confirmation
  return (
    <div style={{ padding: "4rem 1rem" }}>
      <div className="booking-form-wrapper">
        <div className="booking-form-card">
          <div className="booking-success">
            {/* Success icon */}
            <div className="booking-success-icon"><ConfirmationIcon /></div>
            <h2>Booking confirmed</h2>
            <p>
              Thank you for booking with <strong>{booking.business?.name}</strong>.
            </p>
            <p style={{ marginTop: "0.5rem" }}>
              A confirmation has been sent to <strong>{booking.customerEmail}</strong>.
            </p>

            {/* Booking details summary */}
            <div className="booking-summary" style={{ marginTop: "1.5rem", textAlign: "left" }}>
              <h4>Booking Details</h4>
              <div className="summary-row"><span>Service</span><span>{booking.service}</span></div>
              <div className="summary-row"><span>Date</span><span>{new Date(booking.date).toLocaleDateString()}</span></div>
              <div className="summary-row"><span>Time</span><span>{booking.time}</span></div>
              <div className="summary-row"><span>Duration</span><span>{booking.duration} min</span></div>
              <div className="summary-row"><span>Amount Paid</span><span>${booking.price}</span></div>
              <div className="summary-row"><span>Status</span><span className="badge badge-success">Confirmed</span></div>
            </div>

            {/* Link back to home */}
            <Link to="/" className="btn btn-primary" style={{ marginTop: "1.5rem", display: "inline-block" }}>
              Return Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
