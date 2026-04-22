import { NextResponse } from "next/server";
import { listTechnicalLayers } from "@/lib/responder/store";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const floor = Number(searchParams.get("floor")) || 4;

  return NextResponse.json({
    floor,
    layers: listTechnicalLayers(floor),
  });
}
