/**
 * ============================================================
 *  CHAT WIDGET — components/ChatWidget.jsx
 * ============================================================
 *  A floating chat bubble that lets customers talk to the AI assistant.
 *  Shown on the public booking page.
 *
 *  WHAT IT DOES:
 *  - Toggle open/closed with a floating button
 *  - Sends messages to the AI via POST /api/chat
 *  - Displays the conversation (user + assistant messages)
 *  - Persists the conversation in localStorage so it survives page reloads
 *  - Shows a typing indicator while waiting for the AI
 *
 *  KEY CONCEPTS TO LEARN:
 *  1. useState: manages component state (isOpen, messages, input, etc.)
 *  2. useEffect: auto-scroll to bottom, load/save session from localStorage
 *  3. localStorage: chat history is saved per business slug
 *  4. Optimistic UI: the user's message appears immediately before the AI responds
 * ============================================================
 */

// React hooks
import { useState, useRef, useEffect } from "react";
// API helper
import { api } from "../services/api.js";

/**
 * ChatWidget — the floating AI chat assistant.
 *
 * @param {Object} props
 * @param {string} props.businessSlug — the business's URL slug (used for the API call)
 */
export default function ChatWidget({ businessSlug }) {
  // Whether the chat panel is open or closed
  const [isOpen, setIsOpen] = useState(false);
  // The conversation messages: [{ role: "user"|"assistant", content: "..." }]
  const [messages, setMessages] = useState([]);
  // The current text in the input box
  const [input, setInput] = useState("");
  // True while waiting for the AI response
  const [loading, setLoading] = useState(false);
  // The chat session ID (used to continue the same conversation)
  const [sessionId, setSessionId] = useState(null);
  // Reference to the bottom of the messages list (for auto-scroll)
  const messagesEndRef = useRef(null);

  // Auto-scroll to the bottom whenever new messages appear
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // On mount: load any saved chat session from localStorage
  // This lets the conversation continue after a page refresh
  useEffect(() => {
    const saved = localStorage.getItem(`chat_session_${businessSlug}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setSessionId(parsed.sessionId);
        setMessages(parsed.messages || []);
      } catch {
        // ignore invalid localStorage data
      }
    }
  }, [businessSlug]);

  // Whenever the session/messages change, save them to localStorage
  useEffect(() => {
    if (sessionId && messages.length > 0) {
      localStorage.setItem(
        `chat_session_${businessSlug}`,
        JSON.stringify({ sessionId, messages })
      );
    }
  }, [sessionId, messages, businessSlug]);

  /**
   * handleSend — sends the user's message to the AI and displays the response.
   */
  const handleSend = async () => {
    const msg = input.trim();
    if (!msg || loading) return; // don't send empty messages or while loading

    setInput(""); // clear the input
    // Optimistically add the user's message to the UI immediately
    setMessages((prev) => [...prev, { role: "user", content: msg }]);
    setLoading(true);

    try {
      // Call the AI chat API
      const data = await api.chat.send({
        businessSlug,
        message: msg,
        sessionId, // pass the session ID to continue the conversation
      });

      // Save the session ID returned by the server
      setSessionId(data.sessionId);
      // Add the AI's response to the conversation
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.response },
      ]);
    } catch (err) {
      // Show an error message in the chat
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `Sorry, I encountered an error: ${err.message}`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  /**
   * handleKeyDown — pressing Enter sends the message (Shift+Enter = newline).
   */
  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  /**
   * clearChat — resets the conversation and removes it from localStorage.
   */
  const clearChat = () => {
    setMessages([]);
    setSessionId(null);
    localStorage.removeItem(`chat_session_${businessSlug}`);
  };

  return (
    <div className={`chat-widget ${isOpen ? "chat-widget--open" : ""}`}>
      {/* Toggle button — the floating bubble */}
      <button
        className="chat-widget-toggle"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={isOpen ? "Close chat" : "Open chat"}
      >
        {isOpen ? (
          // X icon (close)
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        ) : (
          // Chat bubble icon (open)
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        )}
      </button>

      {/* Chat panel — shown when open */}
      {isOpen && (
        <div className="chat-widget-panel">
          {/* Header with avatar and clear button */}
          <div className="chat-widget-header">
            <div className="chat-widget-header-info">
              <div className="chat-widget-avatar">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="20" height="20">
                  <rect x="3" y="11" width="18" height="10" rx="2" />
                  <circle cx="12" cy="5" r="2" />
                  <path d="M12 7v4" />
                </svg>
              </div>
              <div>
                <strong>AI Assistant</strong>
                <span className="chat-widget-status">Online</span>
              </div>
            </div>
            <button className="chat-widget-clear" onClick={clearChat} title="Clear conversation">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
            </button>
          </div>

          {/* Messages area */}
          <div className="chat-widget-messages">
            {/* Welcome message when no messages yet */}
            {messages.length === 0 && (
              <div className="chat-widget-welcome">
                <p>Welcome. Ask about services, pricing, hours, or availability.</p>
              </div>
            )}
            {/* Render each message */}
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`chat-message chat-message--${msg.role}`}
              >
                <div className="chat-message-content">{msg.content}</div>
              </div>
            ))}
            {/* Typing indicator while waiting for the AI */}
            {loading && (
              <div className="chat-message chat-message--assistant">
                <div className="chat-message-content">
                  <div className="chat-typing">
                    <span className="chat-typing-dot" />
                    <span className="chat-typing-dot" />
                    <span className="chat-typing-dot" />
                  </div>
                </div>
              </div>
            )}
            {/* Invisible element at the bottom for auto-scroll */}
            <div ref={messagesEndRef} />
          </div>

          {/* Input area */}
          <div className="chat-widget-input">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your message..."
              rows={1}
              disabled={loading}
            />
            <button
              className="chat-widget-send"
              onClick={handleSend}
              disabled={!input.trim() || loading}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
