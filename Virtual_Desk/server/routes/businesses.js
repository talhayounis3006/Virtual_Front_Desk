import express from "express";
import Business from "../models/Business.js";
import { protect, authorize } from "../middleware/auth.js";

const router = express.Router();

router.get("/slug/:slug", async (req, res) => {
  try {
    const business = await Business.findOne({ slug: req.params.slug }).populate(
      "owner",
      "name"
    );
    if (!business) {
      return res.status(404).json({ message: "Business not found" });
    }
    res.json(business);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/mine", protect, async (req, res) => {
  try {
    const business = await Business.findOne({ owner: req.user._id });
    if (!business) {
      return res.status(404).json({ message: "No business found" });
    }
    res.json(business);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put("/mine", protect, authorize("owner"), async (req, res) => {
  try {
    const business = await Business.findOneAndUpdate(
      { owner: req.user._id },
      req.body,
      { new: true, runValidators: true }
    );
    if (!business) {
      return res.status(404).json({ message: "Business not found" });
    }
    res.json(business);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post(
  "/mine/services",
  protect,
  authorize("owner"),
  async (req, res) => {
    try {
      const { name, duration, price, description } = req.body;
      if (!name || !duration || price === undefined) {
        return res.status(400).json({ message: "Name, duration, and price are required" });
      }

      const business = await Business.findOne({ owner: req.user._id });
      if (!business) {
        return res.status(404).json({ message: "Business not found" });
      }
      business.services.push({ name, duration, price, description });
      await business.save();
      
      // Return the updated business
      const updatedBusiness = await Business.findById(business._id);
      res.json(updatedBusiness);
    } catch (error) {
      console.error("Add service error:", error);
      res.status(500).json({ message: "Failed to add service" });
    }
  }
);

router.delete(
  "/mine/services/:serviceId",
  protect,
  authorize("owner"),
  async (req, res) => {
    try {
      const business = await Business.findOne({ owner: req.user._id });
      if (!business) {
        return res.status(404).json({ message: "Business not found" });
      }
      business.services = business.services.filter(
        (s) => s._id.toString() !== req.params.serviceId
      );
      await business.save();
      
      // Return the updated business
      const updatedBusiness = await Business.findById(business._id);
      res.json(updatedBusiness);
    } catch (error) {
      console.error("Remove service error:", error);
      res.status(500).json({ message: "Failed to remove service" });
    }
  }
);

export default router;
