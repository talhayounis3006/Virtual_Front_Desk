import express from "express";
import validator from "validator";
import User from "../models/User.js";
import Business from "../models/Business.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

router.post("/register", async (req, res) => {
  try {
    const { name, email, password, role, businessName, category } = req.body;

    // Input validation
    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email, and password are required" });
    }
    if (name.length < 2 || name.length > 50) {
      return res.status(400).json({ message: "Name must be between 2 and 50 characters" });
    }
    if (!validator.isEmail(email)) {
      return res.status(400).json({ message: "Please provide a valid email address" });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }
    if (businessName && businessName.length > 100) {
      return res.status(400).json({ message: "Business name must be under 100 characters" });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ message: "An account with this email already exists" });
    }
    
    // Check if business name is already taken
    if (businessName) {
      const existingBusiness = await Business.findOne({ name: businessName.trim() });
      if (existingBusiness) {
        return res.status(400).json({ message: "Business name already taken" });
      }
    }

    const user = await User.create({
      name: validator.escape(name.trim()),
      email: email.toLowerCase().trim(),
      password,
      role: role || "owner",
    });

    if (role !== "customer" && businessName) {
      const business = await Business.create({
        owner: user._id,
        name: validator.escape(businessName.trim()),
        category: category || "other",
      });
      user.business = business._id;
      await user.save();
    }

    const token = user.generateToken();

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
    if (error.code === 11000) {
      return res.status(400).json({ message: "A duplicate entry was found" });
    }
    res.status(500).json({ message: "Registration failed. Please try again." });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Please provide email and password" });
    }
    if (!validator.isEmail(email)) {
      return res.status(400).json({ message: "Please provide a valid email address" });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() }).select("+password");
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const token = user.generateToken();

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

router.get("/me", protect, async (req, res) => {
  try {
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

export default router;