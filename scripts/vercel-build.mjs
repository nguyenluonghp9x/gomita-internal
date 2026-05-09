#!/usr/bin/env node

import { spawnSync } from "node:child_process";

function run(cmd, args) {
  const result = spawnSync(cmd, args, { stdio: "inherit", shell: true });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

const autoBootstrap = process.env.AUTO_DB_BOOTSTRAP === "true";

if (autoBootstrap) {
  console.log("AUTO_DB_BOOTSTRAP=true -> running prisma db push + seed");
  run("npx", ["prisma", "db", "push", "--accept-data-loss"]);
  run("npx", ["prisma", "db", "seed"]);
} else {
  console.log("AUTO_DB_BOOTSTRAP!=true -> skip db bootstrap");
}

run("next", ["build"]);
