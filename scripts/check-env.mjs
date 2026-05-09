#!/usr/bin/env node

const required = ["DATABASE_URL", "NEXTAUTH_URL", "NEXTAUTH_SECRET"];
const recommended = [
  "SESSION_MAX_AGE_SECONDS",
  "SESSION_UPDATE_AGE_SECONDS",
  "DOCUMENT_MAX_UPLOAD_BYTES",
];

const strict = process.env.ENV_CHECK_STRICT === "true";
const missingRequired = required.filter((k) => !process.env[k]?.trim());
const missingRecommended = recommended.filter((k) => !process.env[k]?.trim());

if (missingRequired.length > 0) {
  console.error(`ENV CHECK: missing required vars: ${missingRequired.join(", ")}`);
  if (strict) process.exit(1);
}

if (missingRecommended.length > 0) {
  console.warn(`ENV CHECK: missing recommended vars: ${missingRecommended.join(", ")}`);
}

if (missingRequired.length === 0 && missingRecommended.length === 0) {
  console.log("ENV CHECK: all required/recommended vars are present.");
} else if (missingRequired.length === 0) {
  console.log("ENV CHECK: required vars are present.");
}

const docStorage = process.env.DOCUMENT_STORAGE?.trim().toLowerCase();
if (docStorage === "s3") {
  const s3Required = ["S3_BUCKET"];
  const s3Missing = s3Required.filter((k) => !process.env[k]?.trim());
  if (s3Missing.length > 0) {
    console.error(
      `ENV CHECK: DOCUMENT_STORAGE=s3 requires: ${s3Missing.join(", ")} (credentials use default AWS chain unless AWS_ACCESS_KEY_ID is set).`,
    );
    if (strict) process.exit(1);
  } else {
    console.log("ENV CHECK: S3 document bucket is set (verify IAM/credentials separately).");
  }
}
