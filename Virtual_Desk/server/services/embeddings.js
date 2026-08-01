import OpenAI from "openai";

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
 * Generate an embedding vector for a given text string using OpenAI.
 * Returns an array of numbers (the embedding).
 */
export async function generateEmbedding(text) {
  if (!process.env.OPENAI_API_KEY) {
    console.warn("OPENAI_API_KEY not set — returning empty embedding");
    return [];
  }

  // OpenRouter doesn't support embeddings endpoint — skip gracefully
  if (process.env.OPENAI_BASE_URL && process.env.OPENAI_BASE_URL.includes("openrouter")) {
    console.warn("OpenRouter detected — skipping embeddings (not supported)");
    return [];
  }

  const response = await getClient().embeddings.create({
    model: "text-embedding-3-small",
    input: text,
  });

  return response.data[0].embedding;
}

/**
 * Compute cosine similarity between two vectors.
 */
export function cosineSimilarity(a, b) {
  if (!a.length || !b.length) return 0;
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom === 0 ? 0 : dot / denom;
}

/**
 * Find the top N most relevant FAQ documents for a given query embedding
 * by performing brute-force cosine similarity search.
 * In production, you'd use MongoDB Atlas Vector Search index for this.
 */
export async function findRelevantFaqs(businessId, queryEmbedding, topN = 3) {
  const FaqDocument = (await import("../models/FaqDocument.js")).default;

  const allFaqs = await FaqDocument.find({
    business: businessId,
    embedding: { $ne: [] },
  }).lean();

  const scored = allFaqs.map((faq) => ({
    ...faq,
    score: cosineSimilarity(queryEmbedding, faq.embedding),
  }));

  scored.sort((a, b) => b.score - a.score);

  return scored.slice(0, topN).filter((f) => f.score > 0.5);
}