/**
 * ============================================================
 *  PAYMENTS ROUTES — routes/payments.js
 * ============================================================
 *  Handles Stripe payment integration:
 *    POST /api/payments/create-checkout-session — create a Stripe Checkout session
 *    POST /api/payments/webhook                  — Stripe webhook (payment confirmation)
 *    GET  /api/payments/session/:sessionId       — get booking by Stripe session ID
 *
 *  HOW PAYMENT FLOW WORKS (Reverse-Engineering Guide):
 *  1. Customer completes the booking form → booking created with status "pending"
 *  2. Frontend calls create-checkout-session with the booking ID
 *  3. Server creates a Stripe Checkout Session (hosted payment page)
 *  4. Customer is redirected to Stripe's secure payment page
 *  5. After payment, Stripe redirects back to success_url
 *  6. Stripe sends a webhook event (checkout.session.completed) to our server
 *  7. Webhook updates the booking status from "pending" to "confirmed"
 *
 *  KEY CONCEPTS TO LEARN:
 *  1. Webhooks: Stripe calls OUR server to notify us of events (not the other way).
 *  2. Raw Body: webhooks need the raw request body for signature verification.
 *  3. Metadata: we pass bookingId in the session metadata so the webhook
 *     knows which booking to update.
 * ============================================================
 */

// Express Router
import express from "express";
// Stripe: payment processing library
import Stripe from "stripe";
// Models
import Booking from "../models/Booking.js";
import Business from "../models/Business.js";

const router = express.Router();

/**
 * Stripe instance — initialized lazily so the env var is available.
 * We create a new Stripe client each time (or could cache it).
 */
function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY);
}

/**
 * POST /api/payments/create-checkout-session
 * PUBLIC — creates a Stripe Checkout Session for a pending booking.
 *
 * Body: { bookingId }
 * Response: { url, sessionId }
 *
 * The booking must already exist with status "pending".
 * On successful payment, the webhook will update the booking to "confirmed".
 */
router.post("/create-checkout-session", async (req, res) => {
  try {
    const { bookingId } = req.body;

    // Validate bookingId is provided
    if (!bookingId) {
      return res.status(400).json({ message: "bookingId is required" });
    }

    // Load the booking and its business (for the business name)
    const booking = await Booking.findById(bookingId).populate("business", "name");
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    // Only pending bookings can be paid
    if (booking.status !== "pending") {
      return res.status(400).json({ message: "Booking is not in pending status" });
    }

    // Prevent double payment
    if (booking.depositPaid) {
      return res.status(400).json({ message: "Payment already completed for this booking" });
    }

    // Determine amount to charge:
    // - If depositAmount is set (> 0), charge the deposit
    // - Otherwise charge the full price
    const amount = booking.depositAmount > 0 ? booking.depositAmount : booking.price;
    // Stripe works in cents (smallest currency unit)
    const amountInCents = Math.round(amount * 100);

    // Stripe minimum charge is $0.50
    if (amountInCents < 50) {
      return res.status(400).json({ message: "Minimum payment is $0.50" });
    }

    const stripe = getStripe();

    // Create the Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"], // accept card payments
      mode: "payment",                // one-time payment (not subscription)
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `${booking.business?.name || "Business"} — ${booking.service}`,
              description: `${booking.date.toISOString().split("T")[0]} at ${booking.time} (${booking.duration} min)`,
            },
            unit_amount: amountInCents,
          },
          quantity: 1,
        },
      ],
      // Metadata: passed through to the webhook so we know which booking to update
      metadata: {
        bookingId: booking._id.toString(),
        businessId: booking.business?._id?.toString() || "",
      },
      // Where to redirect after payment
      success_url: `${process.env.CLIENT_URL || "http://localhost:3000"}/book/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CLIENT_URL || "http://localhost:3000"}/book/${booking.business?.slug || ""}?cancelled=true`,
      // Pre-fill the customer's email on Stripe's page
      customer_email: booking.customerEmail,
    });

    // Save the Stripe session ID on the booking for later lookup
    booking.stripeSessionId = session.id;
    await booking.save();

    // Return the checkout URL — the frontend redirects the user here
    res.json({ url: session.url, sessionId: session.id });
  } catch (error) {
    console.error("Stripe checkout error:", error);
    res.status(500).json({ message: "Failed to create checkout session" });
  }
});

/**
 * POST /api/payments/webhook
 * PUBLIC (called by Stripe) — listens for checkout.session.completed events.
 *
 * IMPORTANT: This route uses express.raw() (see server.js) because Stripe
 * needs the raw body to verify the signature.
 *
 * On success, updates the booking status to "confirmed".
 */
router.post("/webhook", async (req, res) => {
  const sig = req.headers["stripe-signature"];
  let event;

  try {
    const stripe = getStripe();

    if (process.env.STRIPE_WEBHOOK_SECRET && sig) {
      // Production: verify the webhook signature to ensure the request
      // really came from Stripe (not a malicious actor)
      event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } else {
      // Development fallback: parse raw body as JSON (no signature verification)
      // ⚠️ Only for local testing — never use this in production!
      event = JSON.parse(req.body.toString());
    }
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    return res.status(400).json({ message: `Webhook Error: ${err.message}` });
  }

  // Handle the event type
  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    // Get the booking ID from the metadata we set when creating the session
    const bookingId = session.metadata?.bookingId;

    if (bookingId) {
      try {
        // Find and update the booking
        const booking = await Booking.findById(bookingId);
        if (booking) {
          booking.status = "confirmed"; // payment received → confirm the booking
          booking.depositPaid = true;
          booking.stripePaymentIntentId = session.payment_intent; // store Stripe's payment ID
          await booking.save();
          console.log(`Booking ${bookingId} confirmed via Stripe payment`);
        }
      } catch (err) {
        console.error("Error updating booking after payment:", err);
      }
    }
  }

  // Always respond to Stripe with 200 to acknowledge receipt
  res.json({ received: true });
});

/**
 * GET /api/payments/session/:sessionId
 * PUBLIC — returns the booking associated with a Stripe session ID.
 * Used by the success page to show confirmation details.
 */
router.get("/session/:sessionId", async (req, res) => {
  try {
    // Find the booking by its Stripe session ID
    const booking = await Booking.findOne({ stripeSessionId: req.params.sessionId })
      .populate("business", "name slug email phone address");

    if (!booking) {
      return res.status(404).json({ message: "Booking not found for this session" });
    }

    res.json(booking);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Export the router so server.js can mount it at /api/payments
export default router;