#!/usr/bin/env node

const baseUrl = process.env.APP_BASE_URL ?? "http://localhost:3000";

function fail(message) {
  console.error(`GO-LIVE FAIL: ${message}`);
  process.exit(1);
}

function pass(message) {
  console.log(`GO-LIVE OK: ${message}`);
}

async function request(path) {
  const url = `${baseUrl.replace(/\/+$/, "")}${path}`;
  return fetch(url, { redirect: "manual" });
}

async function checkJson(path, expectedStatus, predicate) {
  const res = await request(path);
  if (res.status !== expectedStatus) {
    fail(`${path} returned ${res.status}, expected ${expectedStatus}`);
  }
  const body = await res.json().catch(() => null);
  if (!predicate(body)) {
    fail(`${path} payload unexpected: ${JSON.stringify(body)}`);
  }
  pass(path);
}

async function run() {
  console.log(`Running go-live checks against ${baseUrl}`);
  await checkJson("/api/live", 200, (x) => x?.status === "alive");
  await checkJson("/api/ready", 200, (x) => x?.status === "ready" && x?.env === "ok" && x?.db === "ok");
  await checkJson("/api/health", 200, (x) => x?.status === "ok" && x?.db === "ok");

  const login = await request("/login");
  if (login.status !== 200) fail(`/login returned ${login.status}`);
  pass("/login");

  const providers = await request("/api/auth/providers");
  if (providers.status !== 200) fail(`/api/auth/providers returned ${providers.status}`);
  const payload = await providers.json().catch(() => null);
  if (!payload || typeof payload !== "object" || !("credentials" in payload)) {
    fail("/api/auth/providers missing credentials");
  }
  pass("/api/auth/providers");

  console.log("Go-live baseline checks passed.");
}

run().catch((error) => {
  fail(error instanceof Error ? error.message : String(error));
});
