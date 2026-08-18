import validator from "validator";

export function validatePublicBookingInput(input) {
  const { businessId, serviceId, customerName, customerEmail, date, time } = input;

  if (![businessId, serviceId, customerName, customerEmail, date, time].every((value) => typeof value === "string" && value.trim())) {
    return "Missing required fields";
  }

  if (!validator.isEmail(customerEmail) || customerName.trim().length < 2 || customerName.trim().length > 100) {
    return "Please provide a valid name and email address";
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(new Date(`${date}T00:00:00`).getTime())) {
    return "Please provide a valid booking date";
  }

  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) {
    return "Please provide a valid booking time";
  }

  return null;
}
