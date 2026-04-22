import { NextResponse } from "next/server";
import { buildTriageSummary } from "@/lib/responder/store";

export async function GET() {
  return NextResponse.json({
    triage: buildTriageSummary(),
  });
}
