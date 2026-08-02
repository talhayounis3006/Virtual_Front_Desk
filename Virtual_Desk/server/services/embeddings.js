/**
 * ============================================================
 *  EMBEDDINGS SERVICE — services/embeddings.js
 * ============================================================
 *  Handles AI text embeddings for semantic search.
 *
 *  WHAT ARE EMBEDDINGS?
 *  An embedding is a vector (array of numbers) that represents the
 *  MEANING of a piece of text. Similar texts have similar vectors.
 *  Example: "How much is a haircut?" and "What does a haircut cost?"
 *  would have very similar embeddings because they mean the same thing.
 *
 *  WHAT THIS FILE DOES:
 *  1. generateEmbedding(text) — converts text into a vector using OpenAI
 *  2. cosineSimilarity(a, b) — measures how similar two vectors are
 *  3. findRelevantFaqs(businessId, queryEmbedding, topN) — finds the most
 *     relevant FAQ documents for a customer's question
 *
 *  KEY CONCEPTS TO LEARN:
 *  - Semantic Search: finding documents by MEANING, not just keywords
 *  - Cosine Similarity: a math formula that measures vector similarity
 *  - Brute-Force Search: comparing against ALL documents (fine for small
 *    datasets; production would use MongoDB Atlas Vector Search)
 * ============================================================
 */

// OpenAI: the AI API client (configured to use OpenRouter)
import OpenAI from "openai";

// OpenAI client singleton (created once, reused)
let _openai = null;

function getClient() {
  if (!_openai) {
    _openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      baseURL: process.env.OPENAI_BASE_URL || "https://openrouter.ai/api/v1",
    });
  }
  return _openai;
}

/**
 * generateEmbedding — converts text into an embedding vector.
 *
 * @param {string} text — the text to embed
 * @returns {number[]} — array of numbers representing the text's meaning
 *
 * Returns an empty array if no API key is set or if using OpenRouter
 * (which doesn't support the embeddings endpoint).
 */
export async function generateEmbedding(text) {
  // No API key → can't generate embeddings
  if (!process.env.OPENAI_API_KEY) {
    console.warn("OPENAI_API_KEY not set — returning empty embedding");
    return [];
  }

  // OpenRouter doesn't support embeddings endpoint — skip gracefully
  if (process.env.OPENAI_BASE_URL && process.env.OPENAI_BASE_URL.includes("openrouter")) {
    console.warn("OpenRouter detected — skipping embeddings (not supported)");
    return [];
  }

  // Call OpenAI's embeddings API
  const response = await getClient().embeddings.create({
    model: "text-embedding-3-small", // OpenAI's embedding model
    input: text,
  });

  // The embedding is in response.data[0].embedding
  return response.data[0].embedding;
}

/**
 * cosineSimilarity — measures how similar two vectors are.
 *
 * Returns a value between -1 and 1:
 *  - 1 = identical direction (very similar)
 *  - 0 = orthogonal (unrelated)
 *  - -1 = opposite direction (very different)
 *
 * Formula: dot(A, B) / (|A| * |B|)
 * where |A| is the magnitude (length) of vector A.
 */
export function cosineSimilarity(a, b) {
  // If either vector is empty, they can't be compared
  if (!a.length || !b.length) return 0;

  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];   // dot product: sum of element-wise products
    magA += a[i] * a[i];  // sum of squares for vector A
    magB += b[i] * b[i];  // sum of squares for vector B
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB); // product of magnitudes
  return denom === 0 ? 0 : dot / denom; // avoid division by zero
}

/**
 * findRelevantFaqs — finds the top N most relevant FAQ documents
 * for a given query embedding.
 *
 * HOW IT WORKS:
 * 1. Load ALL FAQs for the business (that have embeddings)
 * 2. Compute cosine similarity between the query and each FAQ
 * 3. Sort by similarity (highest first)
 * 4. Return the top N with similarity > 0.5 (threshold)
 *
 * NOTE: This is a brute-force search (O(n) comparisons).
 * For production with many FAQs, you'd use MongoDB Atlas Vector Search
 * which uses an ANN (Approximate Nearest Neighbor) index for speed.
 */
export async function findRelevantFaqs(businessId, queryEmbedding, topN = 3) {
  // Dynamic import to avoid circular dependency issues
  const FaqDocument = (await import("../models/FaqDocument.js")).default;

  // Load all FAQs for this business that have embeddings
  const allFaqs = await FaqDocument.find({
    business: businessId,
    embedding: { $ne: [] }, // only FAQs with actual embeddings
  }).lean();

  // Score each FAQ by cosine similarity with the query
  const scored = allFaqs.map((faq) => ({
    ...faq,
    score: cosineSimilarity(queryEmbedding, faq.embedding),
  }));

  // Sort by score descending (most similar first)
  scored.sort((a, b) => b.score - a.score);

  // Return top N, but only if similarity > 0.5 (meaningful match)
  return scored.slice(0, topN).filter((f) => f.score > 0.5);
}