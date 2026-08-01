import mongoose from "mongoose";

const serviceSchema = new mongoose.Schema({
  name: { type: String, required: true },
  duration: { type: Number, required: true },
  price: { type: Number, required: true },
  description: String,
});

const businessSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    name: {
      type: String,
      required: [true, "Business name is required"],
      trim: true,
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
    },
    description: String,
    category: {
      type: String,
      enum: ["salon", "clinic", "gym", "tutoring", "agency", "other"],
      default: "other",
    },
    services: [serviceSchema],
    businessHours: {
      monday: { open: String, close: String },
      tuesday: { open: String, close: String },
      wednesday: { open: String, close: String },
      thursday: { open: String, close: String },
      friday: { open: String, close: String },
      saturday: { open: String, close: String },
      sunday: { open: String, close: String },
    },
    address: String,
    phone: String,
    email: String,
    aiEnabled: { type: Boolean, default: true },
    reviewAutomation: { type: Boolean, default: true },
    subscription: {
      plan: { type: String, enum: ["free", "starter", "pro"], default: "free" },
      expiresAt: Date,
    },
  },
  { timestamps: true }
);

businessSchema.pre("save", function (next) {
  if (!this.slug) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }
  next();
});

export default mongoose.model("Business", businessSchema);
