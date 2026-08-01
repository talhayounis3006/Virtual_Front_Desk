import { useState, useEffect } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { api } from "../services/api.js";
import ChatWidget from "../components/ChatWidget.jsx";

const STEPS = ["service", "datetime", "info", "payment"];

export default function PublicBooking() {
  const { slug } = useParams();
  const [searchParams] = useSearchParams();
  const cancelled = searchParams.get("cancelled") === "true";

  const [business, setBusiness] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [bookingResult, setBookingResult] = useState(null);

  const [form, setForm] = useState({
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    serviceId: "",
    date: "",
    time: "",
    notes: "",
  });

  const [slots, setSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);

  // Load business
  useEffect(() => {
    api.business
      .getBySlug(slug)
      .then(setBusiness)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [slug]);

  // Fetch available slots when service + date are selected
  useEffect(() => {
    if (form.serviceId && form.date && business) {
      setSlotsLoading(true);
      api.availability
        .getSlots(business._id, form.date, form.serviceId)
        .then((data) => {
          setSlots(data.slots || []);
        })
        .catch(() => setSlots([]))
        .finally(() => setSlotsLoading(false));
    } else {
      setSlots([]);
    }
  }, [form.serviceId, form.date, business]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    // Reset time when date or service changes
    if (e.target.name === "date" || e.target.name === "serviceId") {
      setForm((prev) => ({ ...prev, [e.target.name]: e.target.value, time: "" }));
    }
  };

  const selectedService = business?.services?.find((s) => s._id === form.serviceId);

  const canProceed = () => {
    switch (step) {
      case 0: return !!form.serviceId;
      case 1: return !!form.date && !!form.time;
      case 2: return !!form.customerName && !!form.customerEmail;
      default: return false;
    }
  };

  const handleNext = () => {
    if (canProceed()) setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const handleBack = () => {
    setStep((s) => Math.max(s - 1, 0));
  };

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

      // 3. Redirect to Stripe Checkout
      window.location.href = session.url;
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  };

  if (loading)
    return (
      <div className="loading-page">
        <div className="loading-spinner" /> Loading booking page...
      </div>
    );
  if (error && !business)
    return <div className="loading-page" style={{ color: "var(--danger)" }}>{error}</div>;
  if (!business) return <div className="loading-page">Business not found</div>;

  return (
    <div>
      <div className="booking-hero">
        <h1>Book with {business.name}</h1>
        <p>{business.description || "Choose a service and pick a time that works for you"}</p>
      </div>

      {cancelled && (
        <div className="booking-form-wrapper">
          <div className="auth-error" style={{ marginBottom: "1rem" }}>
            <span>⚠️</span> Payment was cancelled. Your booking was not created.
          </div>
        </div>
      )}

      <ChatWidget businessSlug={slug} />

      <div className="booking-form-wrapper">
        <div className="booking-form-card">
          {/* Step indicator */}
          <div className="booking-steps">
            {STEPS.map((s, i) => (
              <div
                key={s}
                className={`booking-step ${i === step ? "active" : ""} ${i < step ? "completed" : ""}`}
                onClick={() => i < step && setStep(i)}
              >
                <div className="booking-step-number">
                  {i < step ? "✓" : i + 1}
                </div>
                <div className="booking-step-label">
                  {s === "service" ? "Service" : s === "datetime" ? "Date & Time" : s === "info" ? "Your Info" : "Payment"}
                </div>
              </div>
            ))}
          </div>

          {error && (
            <div className="auth-error">
              <span>⚠️</span> {error}
            </div>
          )}

          {/* Step 0: Service Selection */}
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

          {/* Step 1: Date & Time */}
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
                  min={new Date().toISOString().split("T")[0]}
                  required
                />
              </div>

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
                          {formatTime(slot)}
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

          {/* Step 2: Customer Info */}
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

          {/* Step 3: Payment */}
          {step === 3 && (
            <div className="booking-step-content">
              <h3>Complete Payment</h3>
              <p style={{ marginBottom: "1rem", color: "var(--text-secondary)" }}>
                You'll be redirected to Stripe's secure checkout to complete your payment.
                Your booking will be confirmed once payment is successful.
              </p>

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

function formatTime(time) {
  if (!time) return "";
  const [h, m] = time.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, "0")} ${ampm}`;
}