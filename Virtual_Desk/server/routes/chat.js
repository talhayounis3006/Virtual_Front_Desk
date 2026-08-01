import express from "express";
import crypto from "crypto";
import OpenAI from "openai";
import ChatLog from "../models/ChatLog.js";
import FaqDocument from "../models/FaqDocument.js";
import Business from "../models/Business.js";
import BusinessSettings from "../models/BusinessSettings.js";
import Booking from "../models/Booking.js";
import { protect } from "../middleware/auth.js";
import { generateEmbedding, findRelevantFaqs } from "../services/embeddings.js";

const router = express.Router();

let _openai = null;
function getOpenAI() {
  if (!_openai) {
    _openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      baseURL: process.env.OPENAI_BASE_URL || "https://openrouter.ai/api/v1",
    });
  }
  return _openai;
}

const DAY_NAMES = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

/**
 * Function tool definition for OpenAI function calling.
 * The LLM can call this to check real availability.
 */
const checkAvailabilityFunction = {
  name: "checkAvailability",
  description:
    "Check if a specific date and time slot is available for a given service. " +
    "Returns open slots for that date, or indicates if the business is closed.",
  parameters: {
    type: "object",
    properties: {
      date: {
        type: "string",
        description: "Date in YYYY-MM-DD format",
      },
      service: {
        type: "string",
        description: "The name of the service to check availability for (e.g. 'Haircut', 'Massage')",
      },
    },
    required: ["date", "service"],
    additionalProperties: false,
  },
};

/**
 * Actual implementation of checkAvailability that queries MongoDB.
 */
async function checkAvailabilityImpl(businessId, date, serviceName) {
  const business = await Business.findById(businessId).lean();
  if (!business) return { error: "Business not found" };

  // Find service by name
  const service = business.services?.find(
    (s) => s.name.toLowerCase() === serviceName.toLowerCase()
  );
  if (!service) {
    return {
      error: `Service "${serviceName}" not found. Available services: ${
        business.services?.map((s) => s.name).join(", ") || "none"
      }`,
    };
  }

  // Get business hours
  const settings = await BusinessSettings.findOne({ business: businessId });

  const bookingDate = new Date(date + "T00:00:00");
  const dayName = DAY_NAMES[bookingDate.getDay()];

  let dayHours = settings?.businessHours?.[dayName];
  if (!dayHours || (!dayHours.open && !dayHours.close)) {
    dayHours = business.businessHours?.[dayName];
  }

  if (!dayHours || !dayHours.open || !dayHours.close) {
    return { available: false, slots: [], message: "Business is closed on this day" };
  }

  // Check blackout dates
  if (settings?.blackoutDates?.length) {
    const dateStr = bookingDate.toISOString().split("T")[0];
    const isBlackout = settings.blackoutDates.some((bd) => {
      const bdStr = new Date(bd.date).toISOString().split("T")[0];
      return bdStr === dateStr;
    });
    if (isBlackout) {
      return { available: false, slots: [], message: "This date is a blackout/holiday" };
    }
  }

  // Generate 30-min slots
  const allSlots = generateTimeSlots(dayHours.open, dayHours.close, 30);

  // Fetch existing bookings for this business + date
  const dayStart = new Date(date + "T00:00:00");
  const dayEnd = new Date(date + "T23:59:59");
  const existingBookings = await Booking.find({
    business: businessId,
    date: { $gte: dayStart, $lte: dayEnd },
    status: { $nin: ["cancelled", "no-show"] },
  }).sort({ time: 1 });

  // Build occupied slots
  const occupiedSlots = new Set();
  for (const booking of existingBookings) {
    const startMinutes = timeToMinutes(booking.time);
    const endMinutes = startMinutes + booking.duration;
    for (const slot of allSlots) {
      const slotMinutes = timeToMinutes(slot);
      if (slotMinutes >= startMinutes && slotMinutes < endMinutes) {
        occupiedSlots.add(slot);
      }
    }
  }

  // Filter available slots considering service duration
  const serviceDuration = service.duration;
  const availableSlots = allSlots.filter((slot) => {
    if (occupiedSlots.has(slot)) return false;
    const slotStart = timeToMinutes(slot);
    const slotEnd = slotStart + serviceDuration;
    const closeMinutes = timeToMinutes(dayHours.close);
    if (slotEnd > closeMinutes) return false;
    for (const booking of existingBookings) {
      const bookingStart = timeToMinutes(booking.time);
      if (slotStart < bookingStart && slotEnd > bookingStart) return false;
    }
    return true;
  });

  return {
    available: availableSlots.length > 0,
    slots: availableSlots,
    message:
      availableSlots.length > 0
        ? `Available slots for ${service.name} on ${date}: ${availableSlots.join(", ")}`
        : `No available slots for ${service.name} on ${date}`,
  };
}

/**
 * POST /api/chat
 *
 * Accepts: { businessSlug, message, sessionId?, customerName?, customerEmail? }
 *
 * Uses vector search to find relevant FAQ documents, then sends the user's question
 * along with FAQ context and the checkAvailability function tool to OpenAI.
 * The model can answer from FAQ context or call the function to check real availability.
 */
router.post("/", async (req, res) => {
  try {
    const { businessSlug, message, sessionId, customerName, customerEmail } = req.body;

    if (!businessSlug || !message) {
      return res.status(400).json({ message: "Business slug and message are required" });
    }

    if (message.trim().length === 0) {
      return res.status(400).json({ message: "Message cannot be empty" });
    }

    if (message.length > 2000) {
      return res.status(400).json({ message: "Message too long (max 2000 characters)" });
    }

    const business = await Business.findOne({ slug: businessSlug }).lean();
    if (!business) {
      return res.status(404).json({ message: "Business not found" });
    }

    if (!business.aiEnabled) {
      return res.status(400).json({ message: "AI assistant is disabled" });
    }

    const id = sessionId || crypto.randomUUID();

    let chatLog = await ChatLog.findOne({ sessionId: id });
    if (!chatLog) {
      chatLog = await ChatLog.create({
        business: business._id,
        sessionId: id,
        customerName,
        customerEmail,
        messages: [],
      });
    }

    // Save user message
    chatLog.messages.push({ role: "user", content: message.trim() });
    await chatLog.save();

    // --- Step 1: Vector search for relevant FAQ context ---
    let faqContext = "";
    if (process.env.OPENAI_API_KEY) {
      try {
        const queryEmbedding = await generateEmbedding(message);
        const relevantFaqs = await findRelevantFaqs(business._id, queryEmbedding, 3);

        if (relevantFaqs.length > 0) {
          faqContext =
            "Here are some relevant FAQ entries that may help answer the customer's question:\n" +
            relevantFaqs
              .map(
                (faq, i) =>
                  `${i + 1}. Q: ${faq.question}\n   A: ${faq.answer}`
              )
              .join("\n\n");
        }
      } catch (err) {
        console.error("FAQ vector search error:", err.message);
        // Non-blocking — proceed without FAQ context
      }
    }

    // --- Step 2: Build the system prompt ---
    const servicesList =
      business.services && business.services.length > 0
        ? business.services
            .map((s) => `- ${s.name}: $${s.price} (${s.duration} min)`)
            .join("\n")
        : "No services listed yet.";

    const systemPrompt = `You are a helpful AI assistant for ${business.name}, a ${business.category} business. You help customers with bookings, answer questions about services, pricing, hours, and policies.

Services offered:
${servicesList}

Business hours: ${JSON.stringify(business.businessHours)}
Address: ${business.address || "Not provided"}
Phone: ${business.phone || "Not provided"}

${faqContext ? `\n${faqContext}\n` : ""}

Instructions:
- Answer questions conversationally and concisely.
- Use the provided FAQ context when it's relevant to the customer's question.
- If a customer asks about availability or wants to book a specific date/time, use the checkAvailability function to look up real-time availability.
- If the customer wants to proceed with a booking, guide them to the booking page at /book/${business.slug}.
- If you cannot resolve an issue, suggest they contact the business directly.
- Be friendly, professional, and helpful.`;

    // --- Step 3: Call OpenAI with function tools ---
    let aiResponse;
    let functionCallResult = null;

    if (!process.env.OPENAI_API_KEY) {
      // Fallback behavior if no API key
      aiResponse = fallbackResponse(message, business);
    } else {
      try {
        // Build conversation history for context
        const conversationMessages = [
          { role: "system", content: systemPrompt },
        ];

        // Add last few messages for context (up to 6 previous exchanges)
        const history = chatLog.messages.slice(-12); // last 12 messages (6 user + 6 assistant)
        for (const msg of history) {
          conversationMessages.push({
            role: msg.role,
            content: msg.content,
          });
        }

        const completion = await getOpenAI().chat.completions.create({
          model: "openai/gpt-4o-mini",
          messages: conversationMessages,
          tools: [
            {
              type: "function",
              function: checkAvailabilityFunction,
            },
          ],
          tool_choice: "auto",
          temperature: 0.7,
          max_tokens: 500,
        });

        const choice = completion.choices[0];

        // Check if the model wants to call a function
        if (choice.finish_reason === "tool_calls" && choice.message.tool_calls) {
          const toolCall = choice.message.tool_calls[0];
          if (toolCall.function.name === "checkAvailability") {
            const args = JSON.parse(toolCall.function.arguments);
            const result = await checkAvailabilityImpl(
              business._id,
              args.date,
              args.service
            );
            functionCallResult = result;

            // Send the function result back to the model for a final answer
            const secondCompletion = await getOpenAI().chat.completions.create({
              model: "openai/gpt-4o-mini",
              messages: [
                ...conversationMessages,
                choice.message,
                {
                  role: "tool",
                  tool_call_id: toolCall.id,
                  content: JSON.stringify(result),
                },
              ],
              temperature: 0.7,
              max_tokens: 500,
            });

            aiResponse = secondCompletion.choices[0].message.content;
          } else {
            aiResponse = choice.message.content || "I'm not sure how to help with that.";
          }
        } else {
          aiResponse = choice.message.content || "I'm not sure how to help with that.";
        }
      } catch (err) {
        console.error("OpenAI API error:", err.message);
        aiResponse = fallbackResponse(message, business);
      }
    }

    // Save assistant response
    chatLog.messages.push({ role: "assistant", content: aiResponse });
    if (customerEmail && !chatLog.generatedLead) {
      chatLog.generatedLead = true;
    }
    await chatLog.save();

    res.json({
      response: aiResponse,
      sessionId: id,
      ...(functionCallResult && { availability: functionCallResult }),
    });
  } catch (error) {
    console.error("Chat error:", error);
    res.status(500).json({ message: "Failed to process message" });
  }
});

/**
 * POST /api/chat/faq — seed FAQ documents for a business with embeddings
 * Body: { businessSlug, faqs: [{ question, answer, category? }] }
 */
router.post("/faq", async (req, res) => {
  try {
    const { businessSlug, faqs } = req.body;

    if (!businessSlug || !faqs || !Array.isArray(faqs)) {
      return res.status(400).json({ message: "businessSlug and faqs array are required" });
    }

    const business = await Business.findOne({ slug: businessSlug });
    if (!business) {
      return res.status(404).json({ message: "Business not found" });
    }

    // Delete existing FAQs for this business
    await FaqDocument.deleteMany({ business: business._id });

    const created = [];
    for (const faq of faqs) {
      const combined = `Q: ${faq.question}\nA: ${faq.answer}`;
      let embedding = [];
      if (process.env.OPENAI_API_KEY) {
        try {
          embedding = await generateEmbedding(combined);
        } catch (err) {
          console.error(`Embedding error for "${faq.question}":`, err.message);
        }
      }

      const doc = await FaqDocument.create({
        business: business._id,
        question: faq.question,
        answer: faq.answer,
        embedding,
        category: faq.category || "general",
      });
      created.push(doc);
    }

    res.json({ message: `Created ${created.length} FAQ documents`, count: created.length });
  } catch (error) {
    console.error("FAQ creation error:", error);
    res.status(500).json({ message: "Failed to create FAQ documents" });
  }
});

/**
 * GET /api/chat/logs/:businessId — admin view
 */
router.get("/logs/:businessId", protect, async (req, res) => {
  try {
    const logs = await ChatLog.find({ business: req.params.businessId })
      .sort({ createdAt: -1 })
      .limit(50);
    res.json(logs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/* ---- Helpers ---- */

function generateTimeSlots(open, close, intervalMinutes) {
  const slots = [];
  const openMin = timeToMinutes(open);
  const closeMin = timeToMinutes(close);
  for (let m = openMin; m < closeMin; m += intervalMinutes) {
    slots.push(minutesToTime(m));
  }
  return slots;
}

function timeToMinutes(t) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function minutesToTime(m) {
  const h = Math.floor(m / 60);
  const min = m % 60;
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

function fallbackResponse(message, business) {
  const lowerMessage = message.toLowerCase();
  if (lowerMessage.includes("book") || lowerMessage.includes("appointment") || lowerMessage.includes("schedule")) {
    return `I'd be happy to help you book an appointment with ${business.name}! Please visit our booking page at /book/${business.slug} to see available times and book online.`;
  } else if (lowerMessage.includes("price") || lowerMessage.includes("cost") || lowerMessage.includes("how much")) {
    const servicesList = business.services.map((s) => `- ${s.name}: $${s.price} (${s.duration} min)`).join("\n");
    return `Here are our services and prices:\n${servicesList}\n\nWould you like to book any of these?`;
  } else if (lowerMessage.includes("hour") || lowerMessage.includes("open") || lowerMessage.includes("available")) {
    const hours = business.businessHours;
    const hoursStr = Object.entries(hours)
      .filter(([_, v]) => v.open && v.close)
      .map(([day, v]) => `- ${day.charAt(0).toUpperCase() + day.slice(1)}: ${v.open} - ${v.close}`)
      .join("\n");
    return `Our business hours are:\n${hoursStr || "Not set yet"}\n\nFeel free to book an appointment during these hours!`;
  } else if (lowerMessage.includes("address") || lowerMessage.includes("location") || lowerMessage.includes("where")) {
    return `You can find us at: ${business.address || "Address not provided yet"}\nPhone: ${business.phone || "Not provided"}`;
  } else {
    return `Thank you for reaching out to ${business.name}! I'm here to help. You can ask about our services, pricing, hours, or book an appointment. How can I assist you today?`;
  }
}

export default router;
