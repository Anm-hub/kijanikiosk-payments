"use strict";

const http = require("http");
const { validatePayment, isValidOrderId } = require("./payments");
const { createR2Client, writeReceipt } = require("./r2");
const { version } = require("../package.json");

const PORT = process.env.PORT || 3001;

function createApp(s3Client) {
  const client = s3Client || createR2Client();

  return http.createServer((req, res) => {
    if (req.method === "GET" && req.url === "/health") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "ok", version }));
      return;
    }

    if (req.method === "POST" && req.url === "/validate") {
      let body = "";
      req.on("data", (chunk) => {
        body += chunk;
      });
      req.on("end", () => {
        try {
          const result = validatePayment(JSON.parse(body));
          res.writeHead(result.valid ? 200 : 422, { "Content-Type": "application/json" });
          res.end(JSON.stringify(result));
        } catch {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "invalid JSON" }));
        }
      });
      return;
    }

    if (req.method === "POST" && req.url === "/payments") {
      let body = "";
      req.on("data", (chunk) => {
        body += chunk;
      });
      req.on("end", async () => {
        let parsed;
        try {
          parsed = JSON.parse(body);
        } catch {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "invalid JSON" }));
          return;
        }

        const validation = validatePayment(parsed);
        const errors = [...validation.errors];
        if (!parsed || !isValidOrderId(parsed.orderId)) {
          errors.push("orderId must match ^[A-Za-z0-9][A-Za-z0-9-]{2,63}$");
        }

        if (errors.length > 0) {
          res.writeHead(422, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ valid: false, errors }));
          return;
        }

        const receipt = {
          orderId: parsed.orderId,
          amount: parsed.amountCents / 100,
          currency: parsed.currency,
          submittedAt: new Date().toISOString(),
        };

        try {
          const bucket = process.env.R2_BUCKET || "kijani-receipts-staging";
          const key = await writeReceipt(client, bucket, receipt);
          console.log(JSON.stringify({ event: "payment.accepted", orderId: receipt.orderId, key }));
          res.writeHead(202, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ status: "Accepted", orderId: receipt.orderId, key }));
        } catch (err) {
          console.error(JSON.stringify({ event: "payment.r2_error", orderId: receipt.orderId, message: err.message }));
          res.writeHead(502, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Failed to persist receipt to storage" }));
        }
      });
      return;
    }

    res.writeHead(404);
    res.end();
  });
}

const server = createApp();
server.createApp = createApp;

if (require.main === module) {
  server.listen(PORT, () => {
    console.log("kijanikiosk-payments listening on " + PORT);
  });
}

module.exports = server;

