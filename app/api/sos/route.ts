import { NextResponse } from "next/server";

type SOSRequestBody = {
  roomId?: string;
  floor?: number;
  hotelName?: string;
  message?: string;
  media?: {
    mimeType?: string;
    size?: number;
    base64?: string;
  };
};

export async function POST(request: Request) {
  let body: SOSRequestBody;

  try {
    body = (await request.json()) as SOSRequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const roomId = (body.roomId || "").trim();
  const message = (body.message || "").trim();
  const hasMedia = Boolean(body.media?.base64);

  if (!roomId) {
    return NextResponse.json({ error: "roomId is required" }, { status: 400 });
  }

  if (!message && !hasMedia) {
    return NextResponse.json(
      { error: "At least one of message or media is required" },
      { status: 400 }
    );
  }

  const report = {
    roomId,
    floor: typeof body.floor === "number" ? body.floor : null,
    hotelName: body.hotelName || "Unknown hotel",
    message,
    media: hasMedia
      ? {
          mimeType: body.media?.mimeType || "application/octet-stream",
          size: body.media?.size || 0,
        }
      : null,
    receivedAt: new Date().toISOString(),
  };

  return NextResponse.json({ ok: true, report }, { status: 201 });
}