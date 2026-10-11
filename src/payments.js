"use strict";

const SUPPORTED_CURRENCIES = ["KES", "USD"];

function calculateFee(amountCents, rate) {
  if (!Number.isInteger(amountCents) || amountCents <= 0) {
    throw new Error("amountCents must be a positive integer");
  }
  if (typeof rate !== "number" || rate < 0 || rate > 1) {
    throw new Error("rate must be a number between 0 and 1");
  }
  return Math.round(amountCents * rate);
}

function validatePayment(payment) {
  const errors = [];
  if (!payment || typeof payment !== "object") {
    return { valid: false, errors: ["payment must be an object"] };
  }
  if (!Number.isInteger(payment.amountCents) || payment.amountCents <= 0) {
    errors.push("amountCents must be a positive integer");
  }
  if (!SUPPORTED_CURRENCIES.includes(payment.currency)) {
    errors.push("currency must be one of " + SUPPORTED_CURRENCIES.join(", "));
  }
  return { valid: errors.length === 0, errors };
}

module.exports = { calculateFee, validatePayment, SUPPORTED_CURRENCIES };
