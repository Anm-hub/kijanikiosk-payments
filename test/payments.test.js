"use strict";

const { calculateFee, validatePayment, formatAmount } = require("../src/payments");

describe("calculateFee", () => {
  test("applies the rate and rounds to whole cents", () => {
    expect(calculateFee(10000, 0.029)).toBe(290);
  });

  test("rejects non-positive amounts", () => {
    expect(() => calculateFee(0, 0.029)).toThrow("positive integer");
  });

  test("rejects rates outside 0 to 1", () => {
    expect(() => calculateFee(1000, 1.5)).toThrow("between 0 and 1");
  });
});

describe("validatePayment", () => {
  test("accepts a valid payment", () => {
    expect(validatePayment({ amountCents: 5000, currency: "KES" })).toEqual({
      valid: true,
      errors: [],
    });
  });

  test("rejects an unsupported currency", () => {
    const result = validatePayment({ amountCents: 5000, currency: "XXX" });
    expect(result.valid).toBe(false);
  });

  test("rejects a non-object", () => {
    expect(validatePayment(null).valid).toBe(false);
  });
});

describe("formatAmount", () => {
  test("formats cents as a currency string", () => {
    expect(formatAmount(12345, "KES")).toBe("KES 123.45");
  });

  test("pads single-digit cents", () => {
    expect(formatAmount(5, "USD")).toBe("USD 0.05");
  });

  test("rejects negative amounts", () => {
    expect(() => formatAmount(-1, "KES")).toThrow("non-negative");
  });
});
test("FAULT_INJECTION_TEST", () => { throw new Error("Intentional test fault"); });
