import { NextResponse } from "next/server";
import {
  buildNotificationSummary,
  buildStaffAlertPayload,
  type FcmAlertInput,
} from "@/lib/fcm";

type FcmRequestBody = FcmAlertInput;

export async function GET() {
  return NextResponse.json({
    configured: Boolean(
      process.env.FIREBASE_ADMIN_CLIENT_EMAIL &&
        process.env.FIREBASE_ADMIN_PRIVATE_KEY &&
        process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    ),
    defaultSound: "crisis_alert",
    channelId: "guardianlink-crisis",
  });
}

export async function POST(request: Request) {
  let body: FcmRequestBody;

  try {
    body = (await request.json()) as FcmRequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const title = (body.title || "").trim();
  const bodyText = (body.body || "").trim();

  if (!title || !bodyText) {
    return NextResponse.json(
      { error: "title and body are required" },
      { status: 400 },
    );
  }

  const summary = buildNotificationSummary(body);
  const payload = buildStaffAlertPayload({
    ...body,
    title,
    body: bodyText,
  });

  const configured = Boolean(
    process.env.FIREBASE_ADMIN_CLIENT_EMAIL &&
      process.env.FIREBASE_ADMIN_PRIVATE_KEY &&
      process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  );

  return NextResponse.json({
    configured,
    summary,
    payload,
    deliveryMode: configured ? "ready-for-send" : "simulated",
  });
}
