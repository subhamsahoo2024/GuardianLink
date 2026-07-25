import { NextResponse } from "next/server";
import { listResponderRooms } from "@/lib/responder/store";
import { updateGuestStatus } from "@/lib/staff/store";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const floorVal = searchParams.get("floor");
  const floorParam = floorVal !== null && floorVal !== "" ? Number(floorVal) : null;

  const rooms = listResponderRooms();
  const filteredRooms = floorParam !== null && Number.isFinite(floorParam)
    ? rooms.filter((room) => room.floor === floorParam)
    : rooms;

  return NextResponse.json({ rooms: filteredRooms });
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { roomId, status } = body;

    if (!roomId) {
      return NextResponse.json({ error: "roomId is required" }, { status: 400 });
    }

    const validStatuses = ["checking", "evacuated", "trapped", "no_response"];
    if (!status || !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `status must be one of ${validStatuses.join("|")}` },
        { status: 400 }
      );
    }

    updateGuestStatus(roomId, status);
    return NextResponse.json({ ok: true, roomId, status });
  } catch (error) {
    return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
  }
}
