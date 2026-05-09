import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const startedAt = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({
      status: "ok",
      service: "gomita-internal",
      db: "ok",
      responseMs: Date.now() - startedAt,
      now: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json(
      {
        status: "degraded",
        service: "gomita-internal",
        db: "error",
        responseMs: Date.now() - startedAt,
        now: new Date().toISOString(),
      },
      { status: 503 },
    );
  }
}
