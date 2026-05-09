#!/usr/bin/env node

const baseUrl = process.env.APP_BASE_URL ?? "http://localhost:3000";
const sessionCookie = process.env.SMOKE_SESSION_COOKIE ?? "";

function joinUrl(path) {
  return `${baseUrl.replace(/\/+$/, "")}${path}`;
}

async function request(path, options = {}) {
  const headers = new Headers(options.headers ?? {});
  if (sessionCookie) headers.set("cookie", sessionCookie);

  const res = await fetch(joinUrl(path), {
    ...options,
    headers,
    redirect: "manual",
  });
  return res;
}

function fail(message) {
  console.error(`SMOKE FAIL: ${message}`);
  process.exit(1);
}

function pass(message) {
  console.log(`SMOKE OK: ${message}`);
}

async function checkHealth() {
  const res = await request("/api/health");
  if (res.status !== 200) fail(`/api/health returned ${res.status}`);
  const body = await res.json().catch(() => null);
  if (!body || body.status !== "ok" || body.db !== "ok") {
    fail(`/api/health payload unexpected: ${JSON.stringify(body)}`);
  }
  pass("/api/health");
}

async function checkLive() {
  const res = await request("/api/live");
  if (res.status !== 200) fail(`/api/live returned ${res.status}`);
  const body = await res.json().catch(() => null);
  if (!body || body.status !== "alive") {
    fail(`/api/live payload unexpected: ${JSON.stringify(body)}`);
  }
  pass("/api/live");
}

async function checkReady() {
  const res = await request("/api/ready");
  if (res.status !== 200) fail(`/api/ready returned ${res.status}`);
  const body = await res.json().catch(() => null);
  if (!body || body.status !== "ready" || body.env !== "ok" || body.db !== "ok") {
    fail(`/api/ready payload unexpected: ${JSON.stringify(body)}`);
  }
  pass("/api/ready");
}

async function checkLoginPage() {
  const res = await request("/login");
  if (res.status !== 200) fail(`/login returned ${res.status}`);
  pass("/login");
}

async function checkAuthProviders() {
  const res = await request("/api/auth/providers");
  if (res.status !== 200) fail(`/api/auth/providers returned ${res.status}`);
  const body = await res.json().catch(() => null);
  if (!body || typeof body !== "object") {
    fail("/api/auth/providers returned invalid JSON");
  }
  if (!("credentials" in body)) {
    fail("credentials provider missing in /api/auth/providers");
  }
  pass("/api/auth/providers");
}

async function checkProtectedIfCookie() {
  if (!sessionCookie) {
    console.log("SMOKE SKIP: protected routes (set SMOKE_SESSION_COOKIE to enable)");
    return;
  }

  const dashboardRes = await request("/dashboard");
  if (dashboardRes.status !== 200) fail(`/dashboard returned ${dashboardRes.status}`);
  pass("/dashboard");

  const quotationsRes = await request("/quotations");
  if (quotationsRes.status !== 200) fail(`/quotations returned ${quotationsRes.status}`);
  pass("/quotations");

  const analyticsRes = await request("/quotations/analytics");
  if (analyticsRes.status !== 200) fail(`/quotations/analytics returned ${analyticsRes.status}`);
  pass("/quotations/analytics");
}

async function run() {
  console.log(`Running API smoke checks against ${baseUrl}`);
  await checkLive();
  await checkReady();
  await checkHealth();
  await checkLoginPage();
  await checkAuthProviders();
  await checkProtectedIfCookie();
  console.log("Smoke checks completed successfully.");
}

run().catch((error) => {
  fail(error instanceof Error ? error.message : String(error));
});
