/**
 * ============================================================
 *  AUTH MIDDLEWARE — middleware/auth.js
 * ============================================================
 *  Middleware functions that protect routes from unauthorized access.
 *
 *  KEY CONCEPTS TO LEARN:
 *  1. `protect`: verifies the JWT token in the Authorization header.
 *     If valid, it loads the user from the DB and attaches them to `req.user`.
 *     If invalid/missing, it returns 401 (Unauthorized).
 *  2. `authorize(...roles)`: a middleware FACTORY — it returns a middleware
 *     function that checks if the logged-in user's role is allowed.
 *     Returns 403 (Forbidden) if the role isn't permitted.
 *
 *  HOW IT WORKS IN A ROUTE:
 *    router.put("/:id", protect, authorize("owner", "staff"), handler)
 *    → 1. protect runs first (verifies token, sets req.user)
 *    → 2. authorize runs second (checks req.user.role)
 *    → 3. handler runs only if both pass
 * ============================================================
 */

// jsonwebtoken: verifies the JWT token
import jwt from "jsonwebtoken";
// User model: to load the user document from the database
import User from "../models/User.js";

/**
 * protect — authentication middleware.
 * Verifies that the request has a valid JWT token.
 *
 * Expected header format:
 *   Authorization: Bearer <token>
 *
 * On success: attaches the user document to `req.user` and calls next().
 * On failure: responds with 401 and does NOT call next().
 */
export const protect = async (req, res, next) => {
  let token;

  // Check if the Authorization header exists and starts with "Bearer "
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    // Extract just the token part: "Bearer abc123" → "abc123"
    token = req.headers.authorization.split(" ")[1];
  }

  // No token provided → user is not authenticated
  if (!token) {
    return res.status(401).json({ message: "Not authorized" });
  }

  try {
    // Verify the token's signature and decode its payload
    // If the token was tampered with or expired, this throws an error
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Load the full user document from the database using the id in the token
    // This ensures the user still exists and is active
    req.user = await User.findById(decoded.id);

    // User was deleted after the token was issued
    if (!req.user) {
      return res.status(401).json({ message: "User not found" });
    }

    // Everything checks out — continue to the next middleware/handler
    next();
  } catch (error) {
    // Token invalid, expired, or user lookup failed
    return res.status(401).json({ message: "Not authorized" });
  }
};

/**
 * authorize — authorization middleware (role-based access control).
 *
 * This is a "factory function": it takes the allowed roles and returns
 * a middleware function that enforces them.
 *
 * Usage: authorize("owner", "staff")
 * → Only users with role "owner" or "staff" can proceed.
 */
export const authorize = (...roles) => {
  // Return the actual middleware function
  return (req, res, next) => {
    // req.user was set by `protect` middleware
    // Check if the user's role is in the allowed roles list
    if (!roles.includes(req.user.role)) {
      // 403 = Forbidden (authenticated but not allowed)
      return res.status(403).json({
        message: `Role ${req.user.role} is not authorized`,
      });
    }
    next();
  };
};