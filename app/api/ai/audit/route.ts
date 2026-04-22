import { NextResponse } from "next/server";
import { listAiAuditEntries } from "@/lib/ai/audit";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = Number(searchParams.get("limit")) || 50;

  return NextResponse.json({
    entries: listAiAuditEntries(limit),
  });
}
