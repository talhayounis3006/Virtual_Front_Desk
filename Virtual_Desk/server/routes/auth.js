/**
 * ============================================================
 *  AUTH ROUTES — routes/auth.js
 * ============================================================
 *  Handles user authentication endpoints:
 *    POST /api/auth/register — create a new account
 *    POST /api/auth/login    — sign in with email + password
 *    GET  /api/auth/me       — get the currently logged-in user
 *
 *  KEY CONCEPTS TO LEARN:
 *  1. Input Validation: every field is validated BEFORE touching the database.
 *  2. Password Hashing: handled automatically by the User model's pre-save hook.
 *  3. JWT Tokens: on successful register/login, a token is returned.
 *     The client stores it and sends it with every authenticated request.
 *  4. Business Creation: if registering as an owner with a business name,
 *     a Business document is also created and linked to the user.
 * ============================================================
 */

// Express Router: lets us define routes in a separate file
import express from "express";
// validator: library for validating/sanitizing input (email, length, etc.)
import validator from "validator";
// User model: for creating/finding users
import User from "../models/User.js";
// Business model: for creating a business during owner registration
import Business from "../models/Business.js";
// protect: middleware that verifies the JWT token
import { protect } from "../middleware/auth.js";

// Create a new Express Router instance
const router = express.Router();

/**
 * POST /api/auth/register
 * Creates a new user account (and optionally a business).
 *
 * Request body: { name, email, password, role?, businessName?, category? }
 * Response: { token, user: { id, name, email, role, business } }
 */
router.post("/register", async (req, res) => {
  try {
    // Destructure the request body fields
    const { name, email, password, businessName, category } = req.body;

    // ---- INPUT VALIDATION ----
    // Check required fields exist
    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email, and password are required" });
    }
    // Name length check
    if (name.length < 2 || name.length > 50) {
      return res.status(400).json({ message: "Name must be between 2 and 50 characters" });
    }
    // Email format check using validator library
    if (!validator.isEmail(email)) {
      return res.status(400).json({ message: "Please provide a valid email address" });
    }
    // Password minimum length
    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }
    // Business name length check
    if (businessName && businessName.length > 100) {
      return res.status(400).json({ message: "Business name must be under 100 characters" });
    }

    // Check if a user with this email already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ message: "An account with this email already exists" });
    }
    
    // Check if the business name is already taken
    if (businessName) {
      const existingBusiness = await Business.findOne({ name: businessName.trim() });
      if (existingBusiness) {
        return res.status(400).json({ message: "Business name already taken" });
      }
    }

    // ---- CREATE THE USER ----
    // validator.escape() sanitizes the name to prevent XSS attacks
    // The password is hashed automatically by the User model's pre-save hook
    const user = await User.create({
      name: validator.escape(name.trim()),
      email: email.toLowerCase().trim(),
      password,
      // Public registration creates business owners only. Staff members must be
      // created by an authenticated owner through a dedicated invitation flow.
      role: "owner",
    });

    // ---- CREATE A BUSINESS (if owner/staff with a business name) ----
    if (businessName) {
      const business = await Business.create({
        owner: user._id,
        name: validator.escape(businessName.trim()),
        category: category || "other",
      });
      // Link the business to the user
      user.business = business._id;
      await user.save();
    }

    // Generate a JWT token for the new user (auto-login after registration)
    const token = user.generateToken();

    // Return the token + user info (201 = Created)
    res.status(201).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        business: user.business,
      },
    });
  } catch (error) {
    // Handle duplicate key errors (e.g., email already exists race condition)
    if (error.code === 11000) {
      return res.status(400).json({ message: "A duplicate entry was found" });
    }
    res.status(500).json({ message: "Registration failed. Please try again." });
  }
});

/**
 * POST /api/auth/login
 * Signs in an existing user.
 *
 * Request body: { email, password }
 * Response: { token, user: { id, name, email, role, business } }
 */
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({ message: "Please provide email and password" });
    }
    if (!validator.isEmail(email)) {
      return res.status(400).json({ message: "Please provide a valid email address" });
    }

    // Find the user by email.
    // `.select("+password")` is needed because the password field has
    // `select: false` in the schema — we need it here to compare.
    const user = await User.findOne({ email: email.toLowerCase().trim() }).select("+password");
    if (!user) {
      // Generic error message (don't reveal whether email or password was wrong)
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // Compare the entered password with the stored hash
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // Generate a JWT token for the session
    const token = user.generateToken();

    // Return the token + user info
    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        business: user.business,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Login failed. Please try again." });
  }
});

/**
 * GET /api/auth/me
 * Returns the currently logged-in user's info.
 * Protected by `protect` middleware — requires a valid JWT token.
 *
 * Used by the frontend on page load to restore the session
 * (see AuthContext.jsx).
 */
router.get("/me", protect, async (req, res) => {
  try {
    // req.user was set by the protect middleware
    // .populate("business") replaces the business ObjectId with the full Business document
    const user = await User.findById(req.user._id).populate("business");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json({
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      business: user.business,
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch user data" });
  }
});

// Export the router so server.js can mount it at /api/auth
export default router;
