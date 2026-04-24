import { NextResponse } from "next/server";
import { addBroadcast, listBroadcasts } from "@/lib/staff/store";
import { Priority } from "@/lib/staff/types";

type BroadcastBody = {
  message?: string;
  priority?: Priority;
  target?: "all" | "staff" | "guests";
};

const allowedPriority: Priority[] = ["low", "normal", "high", "critical"];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const filterTarget = searchParams.get("target") as string | null;

  let allBroadcasts = listBroadcasts();

  if (filterTarget === "guests") {
    // Return only broadcasts targeted at guests or all
    allBroadcasts = allBroadcasts.filter(
      (b) => b.target === "guests" || b.target === "all",
    );
  } else if (filterTarget === "staff") {
    // Return only broadcasts targeted at staff or all
    allBroadcasts = allBroadcasts.filter(
      (b) => b.target === "staff" || b.target === "all",
    );
  }

  return NextResponse.json({ broadcasts: allBroadcasts });
}

export async function POST(request: Request) {
  let body: BroadcastBody;

  try {
    body = (await request.json()) as BroadcastBody;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON payload" },
      { status: 400 },
    );
  }

  const message = (body.message || "").trim();
  const priority = body.priority || "normal";
  const target = body.target || "all";

  if (!message) {
    return NextResponse.json({ error: "message is required" }, { status: 400 });
  }

  if (!allowedPriority.includes(priority)) {
    return NextResponse.json(
      { error: "priority must be low|normal|high|critical" },
      { status: 400 },
    );
  }

  const fcmEnabled = Boolean(
    process.env.FIREBASE_ADMIN_CLIENT_EMAIL &&
    process.env.FIREBASE_ADMIN_PRIVATE_KEY &&
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
  );

  const delivery = fcmEnabled ? "sent" : "queued";
  const broadcast = addBroadcast({ message, priority, target, delivery });

  return NextResponse.json({ broadcast, fcmEnabled }, { status: 201 });
}
