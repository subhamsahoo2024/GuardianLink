import { NextResponse } from "next/server";
import { adminDb, isFirebaseAdminConfigured } from "@/lib/firebase-admin";

type SOSRequestBody = {
  roomId?: string;
  floor?: number;
  hotelName?: string;
  message?: string;
  media?: {
    mimeType?: string;
    size?: number;
    base64?: string;
    mediaUrl?: string;
  };
};

export async function POST(request: Request) {
  let body: SOSRequestBody;

  try {
    body = (await request.json()) as SOSRequestBody;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON payload" },
      { status: 400 },
    );
  }

  const roomId = (body.roomId || "").trim();
  const message = (body.message || "").trim();
  const hasMedia = Boolean(body.media?.base64 || body.media?.mediaUrl);

  if (!roomId) {
    return NextResponse.json({ error: "roomId is required" }, { status: 400 });
  }

  if (!message && !hasMedia) {
    return NextResponse.json(
      { error: "At least one of message or media is required" },
      { status: 400 },
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
          mediaUrl: body.media?.mediaUrl || null,
        }
      : null,
    receivedAt: new Date().toISOString(),
  };

  if (!isFirebaseAdminConfigured || !adminDb) {
    return NextResponse.json(
      {
        error:
          "Firebase Admin is not configured. Set FIREBASE_ADMIN_CLIENT_EMAIL, FIREBASE_ADMIN_PRIVATE_KEY, and NEXT_PUBLIC_FIREBASE_PROJECT_ID.",
      },
      { status: 503 },
    );
  }

  await adminDb.collection("sos_reports").add({
    ...report,
    status: "new",
    createdAt: report.receivedAt,
    updatedAt: report.receivedAt,
  });

  return NextResponse.json({ ok: true, report }, { status: 201 });
}
