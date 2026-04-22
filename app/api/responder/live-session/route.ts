import { NextResponse } from "next/server";
import {
  createLiveSession,
  getSessionMessages,
  listLiveSessions,
} from "@/lib/responder/store";

type SessionBody = {
  roomId?: string;
  guestLanguage?: string;
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sessionId = (searchParams.get("sessionId") || "").trim();

  if (sessionId) {
    return NextResponse.json({
      sessionId,
      messages: getSessionMessages(sessionId),
    });
  }

  return NextResponse.json({
    sessions: listLiveSessions(),
  });
}

export async function POST(request: Request) {
  let body: SessionBody;

  try {
    body = (await request.json()) as SessionBody;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON payload" },
      { status: 400 },
    );
  }

  const roomId = (body.roomId || "").trim();
  if (!roomId) {
    return NextResponse.json({ error: "roomId is required" }, { status: 400 });
  }

  const session = createLiveSession({
    roomId,
    guestLanguage: body.guestLanguage,
  });

  return NextResponse.json({ session }, { status: 201 });
}
