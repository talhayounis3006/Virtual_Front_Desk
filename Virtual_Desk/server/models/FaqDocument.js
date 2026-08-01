import mongoose from "mongoose";

const faqDocumentSchema = new mongoose.Schema(
  {
    business: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      required: true,
    },
    question: { type: String, required: true },
    answer: { type: String, required: true },
    embedding: { type: [Number], default: [] },
    category: { type: String, default: "general" },
  },
  { timestamps: true }
);

faqDocumentSchema.index({ business: 1 });
faqDocumentSchema.index({ business: 1, category: 1 });

export default mongoose.model("FaqDocument", faqDocumentSchema);