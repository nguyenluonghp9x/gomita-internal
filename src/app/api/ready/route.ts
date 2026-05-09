import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

const REQUIRED_ENV = ["DATABASE_URL", "NEXTAUTH_URL", "NEXTAUTH_SECRET"] as const;

export async function GET() {
  const startedAt = Date.now();
  const missingEnv = REQUIRED_ENV.filter((k) => !process.env[k]?.trim());
  if (missingEnv.length > 0) {
    return NextResponse.json(
      {
        status: "not_ready",
        service: "gomita-internal",
        env: "missing",
        missingEnv,
        responseMs: Date.now() - startedAt,
        now: new Date().toISOString(),
      },
      { status: 503 },
    );
  }

  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({
      status: "ready",
      service: "gomita-internal",
      env: "ok",
      db: "ok",
      responseMs: Date.now() - startedAt,
      now: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json(
      {
        status: "not_ready",
        service: "gomita-internal",
        env: "ok",
        db: "error",
        responseMs: Date.now() - startedAt,
        now: new Date().toISOString(),
      },
      { status: 503 },
    );
  }
}
