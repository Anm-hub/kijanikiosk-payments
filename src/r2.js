"use strict";

const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");

function createR2Client() {
  return new S3Client({
    region: process.env.AWS_REGION || "auto",
    endpoint: process.env.R2_ENDPOINT,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
    },
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
  });
}

async function writeReceipt(client, bucket, receipt) {
  const key = "receipt-" + receipt.orderId + ".json";
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: JSON.stringify(receipt),
    ContentType: "application/json",
  });
  await client.send(command);
  return key;
}

module.exports = { createR2Client, writeReceipt };
