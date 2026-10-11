"use strict";

const http = require("http");
const { validatePayment } = require("./payments");

const PORT = process.env.PORT || 3001;

const server = http.createServer((req, res) => {
  if (req.method === "GET" && req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok" }));
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

  res.writeHead(404);
  res.end();
});

if (require.main === module) {
  server.listen(PORT, () => {
    console.log("kijanikiosk-payments listening on " + PORT);
  });
}

module.exports = server;
