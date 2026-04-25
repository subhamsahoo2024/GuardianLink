import { NextResponse } from "next/server";
import { adminDb, isFirebaseAdminConfigured } from "@/lib/firebase-admin";
import {
  addBroadcast,
  deleteBroadcast,
  listBroadcasts,
} from "@/lib/staff/store";
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

  if (isFirebaseAdminConfigured && adminDb) {
    const snapshot = await adminDb
      .collection("broadcasts")
      .orderBy("createdAt", "desc")
      .limit(100)
      .get();

    allBroadcasts = snapshot.docs.map((doc) => {
      const data = doc.data() as {
        message?: string;
        priority?: Priority;
        target?: "all" | "staff" | "guests";
        delivery?: "sent" | "queued" | "failed";
        createdAt?: string;
      };

      return {
        id: doc.id,
        message: data.message || "",
        priority: data.priority || "normal",
        target: data.target || "all",
        delivery: data.delivery || "queued",
        createdAt: data.createdAt || new Date(0).toISOString(),
      };
    });
  }

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
  let broadcast = addBroadcast({ message, priority, target, delivery });

  if (isFirebaseAdminConfigured && adminDb) {
    const createdAt = new Date().toISOString();
    const created = await adminDb.collection("broadcasts").add({
      message,
      priority,
      target,
      delivery,
      createdAt,
    });

    broadcast = {
      id: created.id,
      message,
      priority,
      target,
      delivery,
      createdAt,
    };
  }

  return NextResponse.json({ broadcast, fcmEnabled }, { status: 201 });
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = (searchParams.get("id") || "").trim();

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  if (isFirebaseAdminConfigured && adminDb) {
    try {
      await adminDb.collection("broadcasts").doc(id).delete();
      return NextResponse.json({ ok: true, id }, { status: 200 });
    } catch {
      return NextResponse.json(
        { error: "Failed to delete broadcast from Firestore" },
        { status: 500 },
      );
    }
  }

  const removed = deleteBroadcast(id);
  if (!removed) {
    return NextResponse.json({ error: "broadcast not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, id }, { status: 200 });
}
