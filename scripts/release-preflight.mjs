#!/usr/bin/env node

import { spawn } from "node:child_process";

function run(command, args, extraEnv = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: "inherit",
      shell: process.platform === "win32",
      env: { ...process.env, ...extraEnv },
    });

    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve(undefined);
      else reject(new Error(`${command} ${args.join(" ")} failed with code ${code}`));
    });
  });
}

async function main() {
  const baseUrl = process.env.APP_BASE_URL;
  const withSmoke = process.env.PREFLIGHT_WITH_SMOKE !== "false";
  const withEnvCheck = process.env.PREFLIGHT_WITH_ENV_CHECK !== "false";

  console.log("== Release preflight started ==");
  if (withEnvCheck) {
    await run("npm", ["run", "env:check"]);
  } else {
    console.log("Env check skipped (PREFLIGHT_WITH_ENV_CHECK=false).");
  }
  await run("npm", ["run", "lint"]);
  await run("npm", ["run", "build"]);

  if (withSmoke) {
    if (!baseUrl) {
      throw new Error("APP_BASE_URL is required when PREFLIGHT_WITH_SMOKE is not false.");
    }
    await run("npm", ["run", "smoke:api"], { APP_BASE_URL: baseUrl });
  } else {
    console.log("Smoke step skipped (PREFLIGHT_WITH_SMOKE=false).");
  }

  console.log("== Release preflight passed ==");
}

main().catch((err) => {
  console.error(`Preflight failed: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
