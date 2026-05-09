#!/usr/bin/env node

/**
 * Generates a minimal .env.production for pre-domain validation by server IP.
 * Usage:
 *   SERVER_IP=1.2.3.4 NEXTAUTH_SECRET=... POSTGRES_PASSWORD=... node scripts/deploy-pre-domain.mjs
 */
import fs from "node:fs/promises";
import path from "node:path";

function required(name) {
  const v = process.env[name]?.trim();
  if (!v) {
    console.error(`DEPLOY PRE-DOMAIN FAIL: missing ${name}`);
    process.exit(1);
  }
  return v;
}

const SERVER_IP = required("SERVER_IP");
const NEXTAUTH_SECRET = required("NEXTAUTH_SECRET");
const POSTGRES_PASSWORD = required("POSTGRES_PASSWORD");

const lines = [
  "POSTGRES_DB=gomita_internal",
  "POSTGRES_USER=gomita",
  `POSTGRES_PASSWORD=${POSTGRES_PASSWORD}`,
  "APP_PORT=3000",
  `NEXTAUTH_URL=http://${SERVER_IP}`,
  `NEXTAUTH_SECRET=${NEXTAUTH_SECRET}`,
  "LOG_LEVEL=info",
  "SESSION_MAX_AGE_SECONDS=28800",
  "SESSION_UPDATE_AGE_SECONDS=300",
  "DOCUMENT_MAX_UPLOAD_BYTES=26214400",
  "ALLOW_PROD_SEED=false",
  "DOCUMENT_STORAGE=local",
  "NOTIFICATION_SSE_POLL_MS=10000",
  "QUOTATION_PDF_WATERMARK=with_cost",
  "QUOTATION_PDF_WATERMARK_TEXT=INTERNAL",
  "",
];

const out = path.join(process.cwd(), ".env.production");
await fs.writeFile(out, lines.join("\n"), "utf8");
console.log(`Wrote ${out}`);
console.log(`Next step: APP_DOMAIN=${SERVER_IP} npm run nginx:render && npm run docker:edge:up`);
