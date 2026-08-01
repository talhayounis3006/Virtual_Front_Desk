import { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { api } from "../services/api.js";

export default function BookingSuccess() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!sessionId) {
      setError("No session ID provided");
      setLoading(false);
      return;
    }

    api.payments
      .getSession(sessionId)
      .then(setBooking)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [sessionId]);

  if (loading)
    return (
      <div className="loading-page">
        <div className="loading-spinner" /> Verifying payment...
      </div>
    );

  if (error)
    return (
      <div style={{ padding: "4rem 1rem", textAlign: "center" }}>
        <div className="booking-form-wrapper">
          <div className="booking-form-card">
            <div className="booking-success">
              <div className="booking-success-icon" style={{ fontSize: "3rem" }}>✅</div>
              <h2>Payment Successful!</h2>
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

  return (
    <div style={{ padding: "4rem 1rem" }}>
      <div className="booking-form-wrapper">
        <div className="booking-form-card">
          <div className="booking-success">
            <div className="booking-success-icon">✅</div>
            <h2>Booking Confirmed!</h2>
            <p>
              Thank you for booking with <strong>{booking.business?.name}</strong>.
            </p>
            <p style={{ marginTop: "0.5rem" }}>
              A confirmation has been sent to <strong>{booking.customerEmail}</strong>.
            </p>

            <div className="booking-summary" style={{ marginTop: "1.5rem", textAlign: "left" }}>
              <h4>Booking Details</h4>
              <div className="summary-row"><span>Service</span><span>{booking.service}</span></div>
              <div className="summary-row"><span>Date</span><span>{new Date(booking.date).toLocaleDateString()}</span></div>
              <div className="summary-row"><span>Time</span><span>{booking.time}</span></div>
              <div className="summary-row"><span>Duration</span><span>{booking.duration} min</span></div>
              <div className="summary-row"><span>Amount Paid</span><span>${booking.price}</span></div>
              <div className="summary-row"><span>Status</span><span className="badge badge-success">Confirmed</span></div>
            </div>

            <Link to="/" className="btn btn-primary" style={{ marginTop: "1.5rem", display: "inline-block" }}>
              Return Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}