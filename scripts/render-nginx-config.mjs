#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";

const domain = process.env.APP_DOMAIN?.trim();
if (!domain) {
  console.error("NGINX RENDER FAIL: set APP_DOMAIN, e.g. APP_DOMAIN=portal.example.com");
  process.exit(1);
}

const root = process.cwd();
const tplPath = path.join(root, "deploy", "nginx", "default.conf.template");
const outPath = path.join(root, "deploy", "nginx", "default.conf");

const tpl = await fs.readFile(tplPath, "utf8");
const rendered = tpl.replaceAll("__DOMAIN__", domain);
await fs.writeFile(outPath, rendered, "utf8");
console.log(`Rendered nginx config: ${outPath}`);
