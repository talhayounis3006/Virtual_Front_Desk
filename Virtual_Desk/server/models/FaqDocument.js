/**
 * ============================================================
 *  FAQ DOCUMENT MODEL — models/FaqDocument.js
 * ============================================================
 *  Defines the "FaqDocument" collection in MongoDB.
 *  Stores FAQ (Frequently Asked Questions) entries for a business,
 *  along with their AI "embeddings" for semantic search.
 *
 *  KEY CONCEPTS TO LEARN:
 *  1. Embeddings: each FAQ is converted into a vector (array of numbers)
 *     using an AI model. Similar questions have similar vectors, which
 *     allows the AI assistant to find relevant FAQs by "semantic meaning"
 *     rather than exact keyword matching.
 *  2. Vector Search: when a customer asks a question, we embed their
 *     question and find the FAQs with the most similar embeddings
 *     (cosine similarity — see services/embeddings.js).
 *  3. Indexes: queries filter by business, and by business + category.
 * ============================================================
 */

// Mongoose: ODM for MongoDB
import mongoose from "mongoose";

/**
 * faqDocumentSchema — defines the structure of an FAQ document.
 */
const faqDocumentSchema = new mongoose.Schema(
  {
    // Which business this FAQ belongs to
    business: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      required: true,
    },
    // The question (e.g., "Do you offer walk-ins?")
    question: { type: String, required: true },
    // The answer (e.g., "Yes, we accept walk-ins Monday-Friday...")
    answer: { type: String, required: true },
    // The AI embedding vector — an array of numbers representing the
    // semantic meaning of the question+answer combined.
    // Used for similarity search. Empty if no API key is configured.
    embedding: { type: [Number], default: [] },
    // Optional category to organize FAQs (e.g., "pricing", "hours", "general")
    category: { type: String, default: "general" },
  },
  { timestamps: true }
);

// Index for the most common query: "find all FAQs for this business"
faqDocumentSchema.index({ business: 1 });
// Index for: "find all FAQs for this business in this category"
faqDocumentSchema.index({ business: 1, category: 1 });

// Register the schema as a Mongoose model named "FaqDocument"
// This creates/uses the "faqdocuments" collection in MongoDB
export default mongoose.model("FaqDocument", faqDocumentSchema);