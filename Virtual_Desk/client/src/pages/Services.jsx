import { useState, useEffect } from "react";
import { api } from "../services/api.js";

export default function Services() {
  const [business, setBusiness] = useState(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    name: "",
    duration: 30,
    price: 0,
    description: "",
  });

  useEffect(() => {
    api.business
      .getMine()
      .then(setBusiness)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const addService = async (e) => {
    e.preventDefault();
    const updated = await api.business.addService(form);
    setBusiness(updated);
    setForm({ name: "", duration: 30, price: 0, description: "" });
  };

  const removeService = async (id) => {
    const updated = await api.business.removeService(id);
    setBusiness(updated);
  };

  if (loading)
    return (
      <div className="loading-page">
        <div className="loading-spinner" /> Loading services...
      </div>
    );
  if (!business)
    return <div className="loading-page">No business found</div>;

  const colors = ["blue", "green", "purple", "amber", "rose"];

  return (
    <div>
      <div className="page-header">
        <h1>Services</h1>
        <p className="page-subtitle">Manage the services your customers can book</p>
      </div>

      <div className="page-body">
        <div className="grid grid-2">
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
              <div className="form-group">
                <label>Service name</label>
                <input
                  placeholder="e.g. Haircut, Consultation"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>
              <div className="grid grid-2">
                <div className="form-group">
                  <label>Duration (minutes)</label>
                  <input
                    type="number"
                    placeholder="30"
                    value={form.duration}
                    onChange={(e) =>
                      setForm({ ...form, duration: +e.target.value })
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
