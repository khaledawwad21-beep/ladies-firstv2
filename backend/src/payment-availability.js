"use strict";

function onlinePaymentUnavailable(paymentMethod, env = process.env) {
  // Visa discount rules remain testable, but production cannot accept a card
  // payment intent until a verified provider integration replaces this guard.
  return env.NODE_ENV === "production" && paymentMethod === "visa";
}

module.exports = { onlinePaymentUnavailable };
