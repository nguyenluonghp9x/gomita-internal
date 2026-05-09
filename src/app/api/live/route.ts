import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "alive",
    service: "gomita-internal",
    now: new Date().toISOString(),
  });
}
