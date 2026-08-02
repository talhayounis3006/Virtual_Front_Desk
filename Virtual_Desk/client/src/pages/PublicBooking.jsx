/**
 * ============================================================
 *  PUBLIC BOOKING PAGE — pages/PublicBooking.jsx
 * ============================================================
 *  The public-facing booking page where customers book appointments.
 *  Accessible at: /book/:slug (e.g., /book/glamour-studio)
 *
 *  WHAT IT DOES:
 *  - Loads the business by its URL slug
 *  - Guides the customer through a 4-step booking flow:
 *    1. Service selection
 *    2. Date & time selection (with real-time availability)
 *    3. Customer information
 *    4. Payment (redirects to Stripe)
 *  - Includes the AI chat widget
 *
 *  KEY CONCEPTS TO LEARN:
 *  1. Multi-step form: `step` state tracks which step is shown
 *  2. useParams: gets the :slug from the URL
 *  3. useSearchParams: reads query params (e.g., ?cancelled=true)
 *  4. Availability fetching: loads time slots when service + date are selected
 *  5. Payment flow: creates booking → creates Stripe session → redirects
 * ============================================================
 */

// React hooks
import { useState, useEffect } from "react";
// React Router hooks
import { useParams, useSearchParams } from "react-router-dom";
// API helper
import { api } from "../services/api.js";
// AI chat widget
import ChatWidget from "../components/ChatWidget.jsx";

// The 4 steps of the booking flow
const STEPS = ["service", "datetime", "info", "payment"];

/**
 * PublicBooking — the public booking page.
 */
export default function PublicBooking() {
  // Get the business slug from the URL: /book/:slug
  const { slug } = useParams();
  // Read query parameters (e.g., ?cancelled=true after Stripe cancel)
  const [searchParams] = useSearchParams();
  const cancelled = searchParams.get("cancelled") === "true";

  // Business data
  const [business, setBusiness] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  // Current step in the booking flow (0-3)
  const [step, setStep] = useState(0);
  // True while creating the booking + payment session
  const [submitting, setSubmitting] = useState(false);
  // The created booking (after successful submission)
  const [bookingResult, setBookingResult] = useState(null);

  // Booking form state
  const [form, setForm] = useState({
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    serviceId: "",
    date: "",
    time: "",
    notes: "",
  });

  // Available time slots for the selected service + date
  const [slots, setSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);

  // Load the business on mount (or when the slug changes)
  useEffect(() => {
    api.business
      .getBySlug(slug) // GET /api/businesses/slug/:slug
      .then(setBusiness)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [slug]);

  // Fetch available slots whenever service + date are both selected
  useEffect(() => {
    if (form.serviceId && form.date && business) {
      setSlotsLoading(true);
      api.availability
        .getSlots(business._id, form.date, form.serviceId) // GET /api/availability/:id
        .then((data) => {
          setSlots(data.slots || []);
        })
        .catch(() => setSlots([]))
        .finally(() => setSlotsLoading(false));
    } else {
      setSlots([]); // no service/date selected → no slots
    }
  }, [form.serviceId, form.date, business]);

  /**
   * handleChange — updates the form state.
   * When date or service changes, also resets the selected time.
   */
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    // Reset time when date or service changes
    if (e.target.name === "date" || e.target.name === "serviceId") {
      setForm((prev) => ({ ...prev, [e.target.name]: e.target.value, time: "" }));
    }
  };

  // Find the currently selected service object
  const selectedService = business?.services?.find((s) => s._id === form.serviceId);

  /**
   * canProceed — checks if the current step is complete enough to continue.
   */
  const canProceed = () => {
    switch (step) {
      case 0: return !!form.serviceId;                    // step 0: service selected
      case 1: return !!form.date && !!form.time;          // step 1: date + time selected
      case 2: return !!form.customerName && !!form.customerEmail; // step 2: name + email
      default: return false;
    }
  };

  /**
   * handleNext — advances to the next step (if allowed).
   */
  const handleNext = () => {
    if (canProceed()) setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  /**
   * handleBack — goes back to the previous step.
   */
  const handleBack = () => {
    setStep((s) => Math.max(s - 1, 0));
  };

  /**
   * handleSubmitBooking — the final step.
   * 1. Creates the booking (status: "pending")
   * 2. Creates a Stripe Checkout Session
   * 3. Redirects the customer to Stripe's payment page
   */
  const handleSubmitBooking = async () => {
    setError("");
    setSubmitting(true);
    try {
      // 1. Create the booking (status: "pending")
      const booking = await api.bookings.create({
        businessId: business._id,
        serviceId: form.serviceId,
        customerName: form.customerName,
        customerEmail: form.customerEmail,
        customerPhone: form.customerPhone,
        date: form.date,
        time: form.time,
        notes: form.notes,
      });

      // 2. Create Stripe Checkout Session
      const session = await api.payments.createCheckoutSession(booking._id);

      // 3. Redirect to Stripe Checkout (hosted payment page)
      window.location.href = session.url;
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  };

  // Loading state
  if (loading)
    return (
      <div className="loading-page">
        <div className="loading-spinner" /> Loading booking page...
      </div>
    );
  // Error state (business not found)
  if (error && !business)
    return <div className="loading-page" style={{ color: "var(--danger)" }}>{error}</div>;
  // No business found
  if (!business) return <div className="loading-page">Business not found</div>;

  return (
    <div>
      {/* Booking hero header */}
      <div className="booking-hero">
        <h1>Book with {business.name}</h1>
        <p>{business.description || "Choose a service and pick a time that works for you"}</p>
      </div>

      {/* Cancelled payment notice (from Stripe cancel_url) */}
      {cancelled && (
        <div className="booking-form-wrapper">
          <div className="auth-error" style={{ marginBottom: "1rem" }}>
            <span>⚠️</span> Payment was cancelled. Your booking was not created.
          </div>
        </div>
      )}

      {/* AI chat assistant */}
      <ChatWidget businessSlug={slug} />

      <div className="booking-form-wrapper">
        <div className="booking-form-card">
          {/* ---- STEP INDICATOR ---- */}
          <div className="booking-steps">
            {STEPS.map((s, i) => (
              <div
                key={s}
                className={`booking-step ${i === step ? "active" : ""} ${i < step ? "completed" : ""}`}
                onClick={() => i < step && setStep(i)} // allow going back to completed steps
              >
                <div className="booking-step-number">
                  {i < step ? "✓" : i + 1} {/* checkmark for completed steps */}
                </div>
                <div className="booking-step-label">
                  {s === "service" ? "Service" : s === "datetime" ? "Date & Time" : s === "info" ? "Your Info" : "Payment"}
                </div>
              </div>
            ))}
          </div>

          {/* Error message */}
          {error && (
            <div className="auth-error">
              <span>⚠️</span> {error}
            </div>
          )}

          {/* ---- STEP 0: SERVICE SELECTION ---- */}
          {step === 0 && (
            <div className="booking-step-content">
              <h3>Choose a Service</h3>
              <div className="service-list">
                {business.services?.map((s) => (
                  <div
                    key={s._id}
                    className={`service-card ${form.serviceId === s._id ? "selected" : ""}`}
                    onClick={() => setForm({ ...form, serviceId: s._id })}
                  >
                    <div className="service-card-header">
                      <strong>{s.name}</strong>
                      <span className="service-price">${s.price}</span>
                    </div>
                    <div className="service-card-details">
                      <span>{s.duration} min</span>
                      {s.description && <span> — {s.description}</span>}
                    </div>
                  </div>
                ))}
              </div>
              <button className="btn btn-primary btn-lg" style={{ width: "100%", marginTop: "1.5rem" }} onClick={handleNext} disabled={!canProceed()}>
                Continue
              </button>
            </div>
          )}

          {/* ---- STEP 1: DATE & TIME ---- */}
          {step === 1 && (
            <div className="booking-step-content">
              <h3>Pick a Date & Time</h3>
              <div className="form-group">
                <label>Date</label>
                <input
                  name="date"
                  type="date"
                  value={form.date}
                  onChange={handleChange}
                  min={new Date().toISOString().split("T")[0]} // can't book in the past
                  required
                />
              </div>

              {/* Show available time slots once a date is selected */}
              {form.date && (
                <div className="form-group">
                  <label>Available Time Slots</label>
                  {slotsLoading ? (
                    <div className="loading-spinner" />
                  ) : slots.length === 0 ? (
                    <p className="text-muted">No available slots for this date. Try another date.</p>
                  ) : (
                    <div className="slots-grid">
                      {slots.map((slot) => (
                        <button
                          key={slot}
                          type="button"
                          className={`slot-btn ${form.time === slot ? "selected" : ""}`}
                          onClick={() => setForm({ ...form, time: slot })}
                        >
                          {formatTime(slot)} {/* display in 12-hour format */}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="booking-nav-buttons">
                <button className="btn btn-secondary" onClick={handleBack}>Back</button>
                <button className="btn btn-primary" onClick={handleNext} disabled={!canProceed()}>
                  Continue
                </button>
              </div>
            </div>
          )}

          {/* ---- STEP 2: CUSTOMER INFO ---- */}
          {step === 2 && (
            <div className="booking-step-content">
              <h3>Your Information</h3>
              <div className="form-group">
                <label>Your name</label>
                <input
                  name="customerName"
                  placeholder="Full name"
                  value={form.customerName}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="grid grid-2">
                <div className="form-group">
                  <label>Email address</label>
                  <input
                    name="customerEmail"
                    type="email"
                    placeholder="you@example.com"
                    value={form.customerEmail}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Phone number</label>
                  <input
                    name="customerPhone"
                    type="tel"
                    placeholder="(optional)"
                    value={form.customerPhone}
                    onChange={handleChange}
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Additional notes (optional)</label>
                <textarea
                  name="notes"
                  placeholder="Any special requests or information..."
                  value={form.notes}
                  onChange={handleChange}
                  rows={3}
                />
              </div>

              {/* Booking summary */}
              {selectedService && (
                <div className="booking-summary">
                  <h4>Booking Summary</h4>
                  <div className="summary-row"><span>Service</span><span>{selectedService.name}</span></div>
                  <div className="summary-row"><span>Date</span><span>{form.date}</span></div>
                  <div className="summary-row"><span>Time</span><span>{formatTime(form.time)}</span></div>
                  <div className="summary-row"><span>Duration</span><span>{selectedService.duration} min</span></div>
                  <div className="summary-row summary-total"><span>Total</span><span>${selectedService.price}</span></div>
                </div>
              )}

              <div className="booking-nav-buttons">
                <button className="btn btn-secondary" onClick={handleBack}>Back</button>
                <button className="btn btn-primary" onClick={handleNext} disabled={!canProceed()}>
                  Continue to Payment
                </button>
              </div>
            </div>
          )}

          {/* ---- STEP 3: PAYMENT ---- */}
          {step === 3 && (
            <div className="booking-step-content">
              <h3>Complete Payment</h3>
              <p style={{ marginBottom: "1rem", color: "var(--text-secondary)" }}>
                You'll be redirected to Stripe's secure checkout to complete your payment.
                Your booking will be confirmed once payment is successful.
              </p>

              {/* Payment summary */}
              {selectedService && (
                <div className="booking-summary">
                  <h4>Payment Summary</h4>
                  <div className="summary-row"><span>Service</span><span>{selectedService.name}</span></div>
                  <div className="summary-row"><span>Date & Time</span><span>{form.date} at {formatTime(form.time)}</span></div>
                  <div className="summary-row summary-total"><span>Amount Due</span><span>${selectedService.price}</span></div>
                </div>
              )}

              <div className="booking-nav-buttons">
                <button className="btn btn-secondary" onClick={handleBack} disabled={submitting}>Back</button>
                <button
                  className="btn btn-accent btn-lg"
                  style={{ flex: 1 }}
                  onClick={handleSubmitBooking}
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <span className="loading-spinner" style={{ width: 20, height: 20, marginRight: 8 }} />
                      Processing...
                    </>
                  ) : (
                    `Pay $${selectedService?.price || 0} with Card`
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * formatTime — converts "14:30" to "2:30 PM" (12-hour format).
 */
function formatTime(time) {
  if (!time) return "";
  const [h, m] = time.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12; // 0 → 12, 13 → 1, etc.
  return `${hour}:${String(m).padStart(2, "0")} ${ampm}`;
}