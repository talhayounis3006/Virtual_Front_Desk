import mongoose from "mongoose";

const chatLogSchema = new mongoose.Schema(
  {
    business: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      required: true,
    },
    sessionId: { type: String, required: true },
    messages: [
      {
        role: { type: String, enum: ["user", "assistant"], required: true },
        content: { type: String, required: true },
        timestamp: { type: Date, default: Date.now },
      },
    ],
    customerEmail: String,
    customerName: String,
    resolved: { type: Boolean, default: false },
    generatedLead: { type: Boolean, default: false },
  },
  { timestamps: true }
);

chatLogSchema.index({ business: 1, createdAt: -1 });

export default mongoose.model("ChatLog", chatLogSchema);
