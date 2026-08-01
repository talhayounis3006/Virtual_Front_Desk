import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema(
  {
    business: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      required: true,
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    customerName: { type: String, required: true },
    customerEmail: { type: String, required: true },
    customerPhone: String,
    service: { type: String, required: true },
    price: { type: Number, default: 0 },
    depositAmount: { type: Number, default: 0 },
    depositPaid: { type: Boolean, default: false },
    date: { type: Date, required: true },
    time: { type: String, required: true },
    duration: { type: Number, required: true },
    status: {
      type: String,
      enum: ["pending", "confirmed", "completed", "cancelled", "no-show"],
      default: "pending",
    },
    staff: { type: String, default: "" },
    notes: String,
    reviewRequested: { type: Boolean, default: false },
    reviewSubmitted: { type: Boolean, default: false },
    reminderSent: { type: Boolean, default: false },
    reviewRequestSent: { type: Boolean, default: false },
    stripeSessionId: { type: String, default: "" },
    stripePaymentIntentId: { type: String, default: "" },
  },
  { timestamps: true }
);

bookingSchema.index({ business: 1, date: 1 });

export default mongoose.model("Booking", bookingSchema);
