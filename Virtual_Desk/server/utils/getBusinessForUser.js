import Business from "../models/Business.js";
import User from "../models/User.js";

/**
 * Returns the business an owner owns or the business assigned to a staff user.
 * Keeping this lookup in one place prevents route-level authorization drift.
 */
export async function getBusinessForUser(userId) {
  const ownedBusiness = await Business.findOne({ owner: userId });
  if (ownedBusiness) return ownedBusiness;

  const user = await User.findById(userId).populate("business");
  return user?.business || null;
}
