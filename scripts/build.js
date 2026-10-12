"use strict";

const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const src = path.join(root, "src");
const dist = path.join(root, "dist");

fs.rmSync(dist, { recursive: true, force: true });
fs.cpSync(src, dist, { recursive: true });

const files = fs.readdirSync(dist);
if (files.length === 0) {
  console.error("build produced no output");
  process.exit(1);
}
console.log("Built " + files.length + " files into dist/: " + files.join(", "));
throw new Error("FAULT_INJECTION_BUILD");
