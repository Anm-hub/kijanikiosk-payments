const http = require("http");
const { createApp } = require("../src/server");
const { calculateFee, validatePayment, formatAmount } = require("../src/payments");

function postJson(port, path, payload) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(payload);
    const req = http.request(
      {
        hostname: "127.0.0.1",
        port,
        path,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(data),
        },
      },
      (res) => {
        let raw = "";
        res.on("data", (chunk) => {
          raw += chunk;
        });
        res.on("end", () => {
          resolve({ status: res.statusCode, body: JSON.parse(raw) });
        });
      }
    );
    req.on("error", reject);
    req.write(data);
    req.end();
  });
}

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

describe("POST /payments", () => {
  test("returns 422 and never calls S3 on invalid orderId or amount", async () => {
    const mockS3 = { send: async () => ({}) };
    let called = false;
    mockS3.send = async () => {
      called = true;
    };

    const app = createApp(mockS3);
    await new Promise((resolve) => app.listen(0, resolve));
    const port = app.address().port;

    try {
      const res = await postJson(port, "/payments", {
        orderId: "bad id!",
        amountCents: -100,
        currency: "KES",
      });
      expect(res.status).toBe(422);
      expect(res.body.errors.length).toBeGreaterThanOrEqual(2);
      expect(called).toBe(false);
    } finally {
      app.close();
    }
  });

  test("returns 202 and writes expected key and major-unit amount to R2", async () => {
    let sentCommand = null;
    const mockS3 = {
      send: async (cmd) => {
        sentCommand = cmd;
        return {};
      },
    };

    const app = createApp(mockS3);
    await new Promise((resolve) => app.listen(0, resolve));
    const port = app.address().port;

    try {
      const res = await postJson(port, "/payments", {
        orderId: "ORD-PAY-1001",
        amountCents: 450050,
        currency: "KES",
      });
      expect(res.status).toBe(202);
      expect(res.body.key).toBe("receipt-ORD-PAY-1001.json");
      expect(sentCommand.input.Key).toBe("receipt-ORD-PAY-1001.json");
      const writtenBody = JSON.parse(sentCommand.input.Body);
      expect(writtenBody.orderId).toBe("ORD-PAY-1001");
      expect(writtenBody.amount).toBe(4500.5);
      expect(writtenBody.currency).toBe("KES");
    } finally {
      app.close();
    }
  });

  test("returns 502 when R2 write throws an error", async () => {
    const mockS3 = {
      send: async () => {
        throw new Error("R2 connection refused");
      },
    };

    const app = createApp(mockS3);
    await new Promise((resolve) => app.listen(0, resolve));
    const port = app.address().port;

    try {
      const res = await postJson(port, "/payments", {
        orderId: "ORD-PAY-1002",
        amountCents: 1000,
        currency: "USD",
      });
      expect(res.status).toBe(502);
      expect(res.body.error).toBe("Failed to persist receipt to storage");
    } finally {
      app.close();
    }
  });
});

