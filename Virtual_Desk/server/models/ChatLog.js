/**
 * ============================================================
 *  CHAT LOG MODEL — models/ChatLog.js
 * ============================================================
 *  Defines the "ChatLog" collection in MongoDB.
 *  Stores conversations between customers and the AI assistant.
 *
 *  KEY CONCEPTS TO LEARN:
 *  1. Session-based: each chat session has a unique `sessionId` (UUID)
 *     so the frontend can resume a conversation across page reloads.
 *  2. Nested Messages: all messages in a conversation are stored as an
 *     array INSIDE the chat log document (not a separate collection).
 *  3. Lead Capture: `generatedLead` flag marks conversations where the
 *     customer provided their email — valuable for the business owner.
 *  4. Index: sorts by business + createdAt (newest first) for the admin view.
 * ============================================================
 */

// Mongoose: ODM for MongoDB
import mongoose from "mongoose";

/**
 * chatLogSchema — defines the structure of a ChatLog document.
 */
const chatLogSchema = new mongoose.Schema(
  {
    // Which business this chat belongs to
    business: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      required: true,
    },
    // Unique identifier for this conversation session
    // Generated on the client (crypto.randomUUID) or server
    sessionId: { type: String, required: true },

    // All messages in this conversation, in order
    messages: [
      {
        role: {
          type: String,
          enum: ["user", "assistant"], // "user" = customer, "assistant" = AI
          required: true,
        },
        content: { type: String, required: true }, // the message text
        timestamp: { type: Date, default: Date.now }, // when it was sent
      },
    ],

    // Customer info (captured if they provide it during chat)
    customerEmail: String,
    customerName: String,

    // Was the customer's issue resolved?
    resolved: { type: Boolean, default: false },
    // Did this conversation capture a lead (customer provided email)?
    generatedLead: { type: Boolean, default: false },
  },
  { timestamps: true } // auto-add createdAt & updatedAt
);

/**
 * INDEX — speeds up the admin query:
 * "Show me all chat logs for this business, newest first"
 */
chatLogSchema.index({ business: 1, createdAt: -1 });

// Register the schema as a Mongoose model named "ChatLog"
// This creates/uses the "chatlogs" collection in MongoDB
export default mongoose.model("ChatLog", chatLogSchema);