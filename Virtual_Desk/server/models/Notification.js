import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      required: true,
    },
    business: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      required: true,
    },
    type: {
      type: String,
      enum: ["reminder", "review_request"],
      required: true,
    },
    channel: {
      type: String,
      enum: ["email", "sms"],
      required: true,
    },
    recipient: {
      name: { type: String, required: true },
      email: { type: String },
      phone: { type: String },
    },
    status: {
      type: String,
      enum: ["sent", "failed"],
      default: "sent",
    },
    errorMessage: { type: String, default: "" },
    sentAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

notificationSchema.index({ booking: 1, type: 1 });
notificationSchema.index({ business: 1, sentAt: -1 });

export default mongoose.model("Notification", notificationSchema);