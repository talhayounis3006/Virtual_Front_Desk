/**
 * ============================================================
 *  SERVICES PAGE — pages/Services.jsx
 * ============================================================
 *  The business owner's service management page.
 *
 *  WHAT IT DOES:
 *  - Shows a form to add a new service (name, duration, price, description)
 *  - Lists all existing services for the business
 *  - Allows removing services
 *
 *  KEY CONCEPTS TO LEARN:
 *  1. Form state: one `form` object for the add-service form
 *  2. API calls: addService and removeService update the business
 *  3. State update: the response from the API replaces the business state
 *  4. Conditional rendering: empty state when no services exist
 * ============================================================
 */

// React hooks
import { useState, useEffect } from "react";
// API helper
import { api } from "../services/api.js";

/**
 * Services — the service management page.
 */
export default function Services() {
  // The business data (contains the services array)
  const [business, setBusiness] = useState(null);
  // Loading state
  const [loading, setLoading] = useState(true);
  // Add-service form state
  const [form, setForm] = useState({
    name: "",
    duration: 30, // default 30 minutes
    price: 0,
    description: "",
  });

  // Load the business on component mount
  useEffect(() => {
    api.business
      .getMine() // GET /api/businesses/mine
      .then(setBusiness)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  /**
   * addService — adds a new service to the business.
   * The API returns the updated business, which replaces the state.
   */
  const addService = async (e) => {
    e.preventDefault(); // don't reload the page
    const updated = await api.business.addService(form);
    setBusiness(updated); // update the business with the new service
    // Reset the form for the next entry
    setForm({ name: "", duration: 30, price: 0, description: "" });
  };

  /**
   * removeService — removes a service from the business.
   */
  const removeService = async (id) => {
    const updated = await api.business.removeService(id);
    setBusiness(updated); // update the business without the removed service
  };

  // Loading state
  if (loading)
    return (
      <div className="loading-page">
        <div className="loading-spinner" /> Loading services...
      </div>
    );
  // No business found
  if (!business)
    return <div className="loading-page">No business found</div>;

  // Avatar color rotation
  const colors = ["blue", "green", "purple", "amber", "rose"];

  return (
    <div>
      {/* Page header */}
      <div className="page-header">
        <h1>Services</h1>
        <p className="page-subtitle">Manage the services your customers can book</p>
      </div>

      <div className="page-body">
        <div className="grid grid-2">
          {/* ---- ADD SERVICE FORM ---- */}
          <div className="card">
            <div className="section-header">
              <div className="section-header-icon" style={{ background: "var(--success-light)", color: "var(--success)" }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </div>
              <h3>Add a New Service</h3>
            </div>
            <form onSubmit={addService}>
              {/* Service name */}
              <div className="form-group">
                <label>Service name</label>
                <input
                  placeholder="e.g. Haircut, Consultation"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>

              {/* Duration + price side by side */}
              <div className="grid grid-2">
                <div className="form-group">
                  <label>Duration (minutes)</label>
                  <input
                    type="number"
                    placeholder="30"
                    value={form.duration}
                    onChange={(e) =>
                      setForm({ ...form, duration: +e.target.value }) // + converts string to number
                    }
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Price ($)</label>
                  <input
                    type="number"
                    placeholder="0"
                    value={form.price}
                    onChange={(e) =>
                      setForm({ ...form, price: +e.target.value })
                    }
                    required
                  />
                </div>
              </div>

              {/* Description (optional) */}
              <div className="form-group">
                <label>Description (optional)</label>
                <textarea
                  placeholder="Brief description of this service..."
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  rows={3}
                />
              </div>

              <button className="btn btn-primary" type="submit">
                Add Service
              </button>
            </form>
          </div>

          {/* ---- EXISTING SERVICES LIST ---- */}
          <div className="card">
            <div className="section-header">
              <div className="section-header-icon" style={{ background: "var(--info-light)", color: "var(--info)" }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                </svg>
              </div>
              <h3>Your Services ({business.services?.length || 0})</h3>
            </div>

            {/* Empty state */}
            {business.services?.length === 0 && (
              <div className="empty-state">
                <div className="empty-state-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 32, height: 32 }}>
                    <circle cx="12" cy="12" r="3" />
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                  </svg>
                </div>
                <h3>No services yet</h3>
                <p>Add your first service to start accepting bookings</p>
              </div>
            )}

            {/* List of existing services */}
            {business.services?.map((s, i) => (
              <div key={s._id} className="list-item">
                <div className="list-item-info">
                  <div className={`list-item-avatar ${colors[i % colors.length]}`}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                  </div>
                  <div>
                    <div className="list-item-name">{s.name}</div>
                    <div className="list-item-meta">
                      {s.duration} min &middot; ${s.price}
                    </div>
                    {s.description && (
                      <div className="list-item-meta">{s.description}</div>
                    )}
                  </div>
                </div>
                <div className="list-item-actions">
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => removeService(s._id)}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}