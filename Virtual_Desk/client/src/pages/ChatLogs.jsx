/**
 * ============================================================
 *  CHAT LOGS PAGE — pages/ChatLogs.jsx
 * ============================================================
 *  The business owner's view of AI chat conversations.
 *
 *  WHAT IT DOES:
 *  - Fetches the business's chat logs from the API
 *  - Displays each conversation as a card
 *  - Shows customer info, timestamps, and message bubbles
 *  - Highlights captured leads and resolved conversations
 *
 *  KEY CONCEPTS TO LEARN:
 *  1. Chained API calls: first get the business, then get its chat logs
 *  2. Nested data: each log contains a `messages` array
 *  3. Conditional badges: "Lead Captured" and "Resolved" indicators
 *  4. Scrollable message area: maxHeight + overflowY CSS
 * ============================================================
 */

// React hooks
import { useState, useEffect } from "react";
// API helper
import { api } from "../services/api.js";

/**
 * ChatLogs — the AI chat logs page.
 */
export default function ChatLogs() {
  // The chat logs for the business
  const [logs, setLogs] = useState([]);
  // Loading state
  const [loading, setLoading] = useState(true);

  // Load chat logs on component mount
  useEffect(() => {
    api.business
      .getMine() // First: get the business (to get its _id)
      .then((business) => {
        if (business?._id) {
          // Second: get the chat logs for this business
          return api.chat.getLogs(business._id);
        }
        return []; // no business → no logs
      })
      .then(setLogs)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Loading state
  if (loading)
    return (
      <div className="loading-page">
        <div className="loading-spinner" /> Loading chat logs...
      </div>
    );

  return (
    <div>
      {/* Page header */}
      <div className="page-header">
        <h1>AI Chat Logs</h1>
        <p className="page-subtitle">
          View conversations between your AI assistant and customers
        </p>
      </div>

      <div className="page-body">
        {/* Empty state */}
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

        {/* Render each chat log as a card */}
        {logs.map((log) => (
          <div key={log._id} className="card" style={{ marginBottom: "1rem" }}>
            {/* Header: customer info + badges */}
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
                {/* Badge: this conversation captured a lead (email) */}
                {log.generatedLead && (
                  <span className="badge badge-confirmed">Lead Captured</span>
                )}
                {/* Badge: the customer's issue was resolved */}
                {log.resolved && (
                  <span className="badge badge-completed">Resolved</span>
                )}
              </div>
            </div>

            {/* Scrollable message area */}
            <div
              style={{
                maxHeight: 320,
                overflowY: "auto",
                padding: "0.5rem 0",
              }}
            >
              {/* Render each message in the conversation */}
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