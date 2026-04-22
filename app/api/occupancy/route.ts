import { NextResponse } from "next/server";
import { listDangerZones, listGuests } from "@/lib/staff/store";

export async function GET() {
  return NextResponse.json({
    guests: listGuests(),
    dangerZones: listDangerZones(),
  });
}
