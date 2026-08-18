import test from "node:test";
import assert from "node:assert/strict";
import { validatePublicBookingInput } from "../utils/bookingValidation.js";

const validBooking = {
  businessId: "66b4a4ed488b441c90410011",
  serviceId: "66b4a4ed488b441c90410012",
  customerName: "Leah Martin",
  customerEmail: "leah@example.com",
  date: "2026-09-15",
  time: "09:30",
};

test("accepts a complete public booking request", () => {
  assert.equal(validatePublicBookingInput(validBooking), null);
});

test("rejects missing and malformed customer data", () => {
  assert.equal(validatePublicBookingInput({ ...validBooking, customerName: "" }), "Missing required fields");
  assert.equal(validatePublicBookingInput({ ...validBooking, customerEmail: "not-an-email" }), "Please provide a valid name and email address");
});

test("rejects invalid dates and times", () => {
  assert.equal(validatePublicBookingInput({ ...validBooking, date: "15/09/2026" }), "Please provide a valid booking date");
  assert.equal(validatePublicBookingInput({ ...validBooking, time: "25:00" }), "Please provide a valid booking time");
});
