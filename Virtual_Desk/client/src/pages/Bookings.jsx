import { useState, useEffect } from "react";
import { api } from "../services/api.js";

const STATUS_OPTIONS = ["pending", "confirmed", "completed", "cancelled", "no-show"];
const STAFF_OPTIONS = ["Sarah Mitchell", "James Chen", "Emily Rodriguez"];

export default function Bookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Modal state
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [editStaff, setEditStaff] = useState("");
  const [editStatus, setEditStatus] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const loadBookings = () => {
    setLoading(true);
    setError("");
    api.bookings
      .getAll()
      .then(setBookings)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(loadBookings, []);

  const openModal = (booking) => {
    setSelectedBooking(booking);
    setEditStaff(booking.staff || "");
    setEditStatus(booking.status);
    setEditNotes(booking.notes || "");
  };

  const closeModal = () => {
    setSelectedBooking(null);
    setSaving(false);
  };

  const saveChanges = async () => {
    if (!selectedBooking) return;
    setSaving(true);
    setError("");
    try {
      await api.bookings.update(selectedBooking._id, {
        staff: editStaff,
        status: editStatus,
        notes: editNotes,
      });
      closeModal();
      loadBookings();
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  if (loading)
    return (
      <div className="loading-page">
        <div className="loading-spinner" /> Loading bookings...
      </div>
    );

  const colors = ["blue", "green", "purple", "amber", "rose"];

  return (
    <div>
      <div className="page-header">
        <h1>Bookings</h1>
        <p className="page-subtitle">Manage all your appointments in one place</p>
      </div>

      <div className="page-body">
        {error && (
          <div className="auth-error" style={{ marginBottom: "1rem" }}>
            <span>⚠️</span> {error}
          </div>
        )}

        <div className="card">
          {bookings.length === 0 && (
            <div className="empty-state">
              <div className="empty-state-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 32, height: 32 }}>
                  <rect x="3" y="4" width="18" height="18" rx="2" />
                  <path d="M16 2v4" />
                  <path d="M8 2v4" />
                  <path d="M3 10h18" />
                </svg>
              </div>
              <h3>No bookings yet</h3>
              <p>Appointments from customers will appear here</p>
            </div>
          )}
          {bookings.map((b, i) => (
            <div
              key={b._id}
              className="list-item"
              style={{ cursor: "pointer" }}
              onClick={() => openModal(b)}
            >
              <div className="list-item-info">
                <div className={`list-item-avatar ${colors[i % colors.length]}`}>
                  {b.customerName?.charAt(0)?.toUpperCase()}
                </div>
                <div>
                  <div className="list-item-name">{b.customerName}</div>
                  <div className="list-item-meta">
                    {b.service} &middot;{" "}
                    {new Date(b.date).toLocaleDateString()} at {b.time}
                  </div>
                  {b.customerEmail && (
                    <div className="list-item-meta">{b.customerEmail}</div>
                  )}
                  {b.staff && (
                    <div className="list-item-meta" style={{ color: "var(--info)" }}>
                      Staff: {b.staff}
                    </div>
                  )}
                </div>
              </div>
              <div className="list-item-actions">
                <span className={`badge badge-${b.status}`}>{b.status}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Detail Modal */}
      {selectedBooking && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Booking Details</h2>
              <button className="modal-close" onClick={closeModal}>&times;</button>
            </div>

            <div className="modal-body">
              <div className="detail-grid">
                <div className="detail-field">
                  <label>Customer Name</label>
                  <p>{selectedBooking.customerName}</p>
                </div>
                <div className="detail-field">
                  <label>Email</label>
                  <p>{selectedBooking.customerEmail}</p>
                </div>
                <div className="detail-field">
                  <label>Phone</label>
                  <p>{selectedBooking.customerPhone || "—"}</p>
                </div>
                <div className="detail-field">
                  <label>Service</label>
                  <p>{selectedBooking.service}</p>
                </div>
                <div className="detail-field">
                  <label>Date</label>
                  <p>{new Date(selectedBooking.date).toLocaleDateString()}</p>
                </div>
                <div className="detail-field">
                  <label>Time</label>
                  <p>{selectedBooking.time}</p>
                </div>
                <div className="detail-field">
                  <label>Duration</label>
                  <p>{selectedBooking.duration} min</p>
                </div>
                <div className="detail-field">
                  <label>Price</label>
                  <p>${selectedBooking.price}</p>
                </div>
              </div>

              <hr style={{ margin: "1.5rem 0", border: "none", borderTop: "1px solid var(--border)" }} />

              <div className="form-group">
                <label>Assigned Staff</label>
                <select
                  value={editStaff}
                  onChange={(e) => setEditStaff(e.target.value)}
                >
                  <option value="">Unassigned</option>
                  {STAFF_OPTIONS.map((name) => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Status</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Notes</label>
                <textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  rows={3}
                  placeholder="Add notes about this booking..."
                />
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={closeModal}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={saveChanges}
                disabled={saving}
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0,0,0,0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 1rem;
        }
        .modal-content {
          background: var(--card-bg, #fff);
          border-radius: 12px;
          width: 100%;
          max-width: 560px;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        }
        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1.25rem 1.5rem;
          border-bottom: 1px solid var(--border);
        }
        .modal-header h2 {
          margin: 0;
          font-size: 1.2rem;
        }
        .modal-close {
          background: none;
          border: none;
          font-size: 1.5rem;
          cursor: pointer;
          color: var(--text-muted);
          padding: 0;
          line-height: 1;
        }
        .modal-close:hover {
          color: var(--text);
        }
        .modal-body {
          padding: 1.5rem;
        }
        .modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 0.75rem;
          padding: 1rem 1.5rem;
          border-top: 1px solid var(--border);
        }
        .detail-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }
        .detail-field label {
          display: block;
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--text-muted);
          margin-bottom: 0.25rem;
        }
        .detail-field p {
          margin: 0;
          font-size: 0.95rem;
          color: var(--text);
        }
      `}</style>
    </div>
  );
}