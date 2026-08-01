import mongoose from "mongoose";

const businessSettingsSchema = new mongoose.Schema(
  {
    business: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      required: true,
      unique: true,
    },
    businessHours: {
      monday: { open: { type: String, default: "09:00" }, close: { type: String, default: "18:00" } },
      tuesday: { open: { type: String, default: "09:00" }, close: { type: String, default: "18:00" } },
      wednesday: { open: { type: String, default: "09:00" }, close: { type: String, default: "18:00" } },
      thursday: { open: { type: String, default: "09:00" }, close: { type: String, default: "18:00" } },
      friday: { open: { type: String, default: "09:00" }, close: { type: String, default: "18:00" } },
      saturday: { open: { type: String, default: "09:00" }, close: { type: String, default: "17:00" } },
      sunday: { open: { type: String, default: "" }, close: { type: String, default: "" } },
    },
    blackoutDates: [
      {
        date: { type: Date, required: true },
        reason: { type: String, default: "" },
      },
    ],
  },
  { timestamps: true }
);

export default mongoose.model("BusinessSettings", businessSettingsSchema);