/**
 * ============================================================
 *  BUSINESSES ROUTES — routes/businesses.js
 * ============================================================
 *  Handles business-related endpoints:
 *    GET  /api/businesses/slug/:slug       — public: get business by URL slug
 *    GET  /api/businesses/mine             — protected: get logged-in user's business
 *    PUT  /api/businesses/mine             — protected (owner): update business
 *    POST /api/businesses/mine/services    — protected (owner): add a service
 *    DELETE /api/businesses/mine/services/:serviceId — protected (owner): remove a service
 *
 *  KEY CONCEPTS TO LEARN:
 *  1. Slug-based lookup: public pages use the human-readable slug
 *     (e.g., "glamour-studio") instead of the MongoDB _id.
 *  2. Ownership checks: routes verify the logged-in user OWNS the business
 *     before allowing modifications.
 *  3. Nested document manipulation: services are sub-documents inside the
 *     business document — we push/filter them rather than using a separate collection.
 * ============================================================
 */

// Express Router
import express from "express";
// Business model
import Business from "../models/Business.js";
// Auth middleware
import { protect, authorize } from "../middleware/auth.js";

const router = express.Router();

/**
 * GET /api/businesses/slug/:slug
 * PUBLIC — returns a business by its URL slug.
 * Used by the public booking page: /book/glamour-studio
 */
router.get("/slug/:slug", async (req, res) => {
  try {
    // Find the business by slug and include the owner's name
    const business = await Business.findOne({ slug: req.params.slug }).populate(
      "owner",
      "name" // only include the owner's name field
    );
    if (!business) {
      return res.status(404).json({ message: "Business not found" });
    }
    res.json(business);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * GET /api/businesses/mine
 * PROTECTED — returns the logged-in user's business.
 * Used by the Services and ChatLogs pages.
 */
router.get("/mine", protect, async (req, res) => {
  try {
    // Find the business owned by the logged-in user
    const business = await Business.findOne({ owner: req.user._id });
    if (!business) {
      return res.status(404).json({ message: "No business found" });
    }
    res.json(business);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * PUT /api/businesses/mine
 * PROTECTED (owner) — updates the logged-in user's business.
 * Body: any business fields to update (name, description, hours, etc.)
 */
router.put("/mine", protect, authorize("owner"), async (req, res) => {
  try {
    // findOneAndUpdate: find by owner and update in one operation
    // { new: true } returns the updated document
    // { runValidators: true } runs schema validation on the update
    const business = await Business.findOneAndUpdate(
      { owner: req.user._id },
      req.body, // update with whatever fields were sent
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

/**
 * POST /api/businesses/mine/services
 * PROTECTED (owner) — adds a new service to the business.
 * Body: { name, duration, price, description? }
 */
router.post(
  "/mine/services",
  protect,
  authorize("owner"),
  async (req, res) => {
    try {
      const { name, duration, price, description } = req.body;
      // Validate required fields
      if (!name || !duration || price === undefined) {
        return res.status(400).json({ message: "Name, duration, and price are required" });
      }

      // Find the owner's business
      const business = await Business.findOne({ owner: req.user._id });
      if (!business) {
        return res.status(404).json({ message: "Business not found" });
      }
      
      // Push the new service into the nested services array
      // Mongoose automatically assigns an _id to the new sub-document
      business.services.push({ name, duration, price, description });
      await business.save();
      
      // Return the updated business (with the new service included)
      const updatedBusiness = await Business.findById(business._id);
      res.json(updatedBusiness);
    } catch (error) {
      console.error("Add service error:", error);
      res.status(500).json({ message: "Failed to add service" });
    }
  }
);

/**
 * DELETE /api/businesses/mine/services/:serviceId
 * PROTECTED (owner) — removes a service from the business.
 */
router.delete(
  "/mine/services/:serviceId",
  protect,
  authorize("owner"),
  async (req, res) => {
    try {
      // Find the owner's business
      const business = await Business.findOne({ owner: req.user._id });
      if (!business) {
        return res.status(404).json({ message: "Business not found" });
      }
      
      // Filter out the service with the matching _id
      // This creates a new array WITHOUT the removed service
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

// Export the router so server.js can mount it at /api/businesses
export default router;