import express from "express";
import Stripe from "stripe";
import Booking from "../models/Booking.js";
import Business from "../models/Business.js";

const router = express.Router();

// Stripe instance — initialized lazily so the env var is available
function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY);
}

/**
 * POST /api/payments/create-checkout-session
 *
 * Creates a Stripe Checkout Session for a pending booking.
 * The booking must already exist with status "pending".
 * On successful payment, the webhook will update the booking to "confirmed".
 *
 * Body: { bookingId }
 */
router.post("/create-checkout-session", async (req, res) => {
  try {
    const { bookingId } = req.body;

    if (!bookingId) {
      return res.status(400).json({ message: "bookingId is required" });
    }

    const booking = await Booking.findById(bookingId).populate("business", "name");
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    if (booking.status !== "pending") {
      return res.status(400).json({ message: "Booking is not in pending status" });
    }

    if (booking.depositPaid) {
      return res.status(400).json({ message: "Payment already completed for this booking" });
    }

    // Determine amount to charge: if depositAmount is set, charge that; otherwise charge full price
    const amount = booking.depositAmount > 0 ? booking.depositAmount : booking.price;
    const amountInCents = Math.round(amount * 100);

    if (amountInCents < 50) {
      return res.status(400).json({ message: "Minimum payment is $0.50" });
    }

    const stripe = getStripe();

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
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
      metadata: {
        bookingId: booking._id.toString(),
        businessId: booking.business?._id?.toString() || "",
      },
      success_url: `${process.env.CLIENT_URL || "http://localhost:3000"}/book/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CLIENT_URL || "http://localhost:3000"}/book/${booking.business?.slug || ""}?cancelled=true`,
      customer_email: booking.customerEmail,
    });

    // Save the Stripe session ID on the booking
    booking.stripeSessionId = session.id;
    await booking.save();

    res.json({ url: session.url, sessionId: session.id });
  } catch (error) {
    console.error("Stripe checkout error:", error);
    res.status(500).json({ message: "Failed to create checkout session" });
  }
});

/**
 * POST /api/payments/webhook
 *
 * Stripe webhook endpoint — listens for checkout.session.completed events.
 * On success, updates the booking status to "confirmed".
 *
 * IMPORTANT: In production, verify the webhook signature using STRIPE_WEBHOOK_SECRET.
 * For local testing with the Stripe CLI, you can use the raw body.
 */
router.post("/webhook", async (req, res) => {
  const sig = req.headers["stripe-signature"];
  let event;

  try {
    const stripe = getStripe();

    if (process.env.STRIPE_WEBHOOK_SECRET && sig) {
      // Verify webhook signature
      event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } else {
      // Fallback: parse raw body as JSON (for testing without webhook secret)
      event = JSON.parse(req.body.toString());
    }
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    return res.status(400).json({ message: `Webhook Error: ${err.message}` });
  }

  // Handle the event
  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const bookingId = session.metadata?.bookingId;

    if (bookingId) {
      try {
        const booking = await Booking.findById(bookingId);
        if (booking) {
          booking.status = "confirmed";
          booking.depositPaid = true;
          booking.stripePaymentIntentId = session.payment_intent;
          await booking.save();
          console.log(`Booking ${bookingId} confirmed via Stripe payment`);
        }
      } catch (err) {
        console.error("Error updating booking after payment:", err);
      }
    }
  }

  res.json({ received: true });
});

/**
 * GET /api/payments/session/:sessionId
 *
 * Returns the booking associated with a Stripe session ID.
 * Used by the success page to show confirmation details.
 */
router.get("/session/:sessionId", async (req, res) => {
  try {
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

export default router;