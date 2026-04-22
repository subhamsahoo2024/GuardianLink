import { NextResponse } from "next/server";
import { listResponderRooms } from "@/lib/responder/store";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const floorParam = Number(searchParams.get("floor"));

  const rooms = listResponderRooms();
  const filteredRooms = Number.isFinite(floorParam)
    ? rooms.filter((room) => room.floor === floorParam)
    : rooms;

  return NextResponse.json({ rooms: filteredRooms });
}
