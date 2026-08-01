import { useState, useEffect } from "react";
import { api } from "../services/api.js";

export default function ChatLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.business
      .getMine()
      .then((business) => {
        if (business?._id) {
          return api.chat.getLogs(business._id);
        }
        return [];
      })
      .then(setLogs)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading)
    return (
      <div className="loading-page">
        <div className="loading-spinner" /> Loading chat logs...
      </div>
    );

  return (
    <div>
      <div className="page-header">
        <h1>AI Chat Logs</h1>
        <p className="page-subtitle">
          View conversations between your AI assistant and customers
        </p>
      </div>

      <div className="page-body">
        {logs.length === 0 && (
          <div className="card">
            <div className="empty-state">
              <div className="empty-state-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 32, height: 32 }}>
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              </div>
              <h3>No conversations yet</h3>
              <p>
                When customers interact with your AI assistant, those
                conversations will appear here
              </p>
            </div>
          </div>
        )}
        {logs.map((log) => (
          <div key={log._id} className="card" style={{ marginBottom: "1rem" }}>
            <div className="section-header">
              <div className="list-item-avatar blue">
                {log.customerName?.charAt(0)?.toUpperCase() || "?"}
              </div>
              <div style={{ flex: 1 }}>
                <h3>{log.customerName || "Anonymous Visitor"}</h3>
                <div className="list-item-meta">
                  {log.customerEmail && <span>{log.customerEmail} &middot; </span>}
                  {new Date(log.createdAt).toLocaleString()}
                </div>
              </div>
              <div className="list-item-actions">
                {log.generatedLead && (
                  <span className="badge badge-confirmed">Lead Captured</span>
                )}
                {log.resolved && (
                  <span className="badge badge-completed">Resolved</span>
                )}
              </div>
            </div>
            <div
              style={{
                maxHeight: 320,
                overflowY: "auto",
                padding: "0.5rem 0",
              }}
            >
              {log.messages.map((msg, i) => (
                <div
                  key={i}
                  className={`chat-bubble ${msg.role}`}
                >
                  <div className="chat-role">
                    {msg.role === "user" ? "Customer" : "AI Assistant"}
                  </div>
                  {msg.content}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
