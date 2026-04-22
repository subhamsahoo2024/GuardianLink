import { NextResponse } from "next/server";
import {
  deleteDangerZone,
  listDangerZones,
  upsertDangerZone,
} from "@/lib/staff/store";
import { Severity } from "@/lib/staff/types";

type ZoneBody = {
  id?: string;
  floor?: number;
  label?: string;
  severity?: Severity;
  center?: { lat?: number; lng?: number };
  radiusMeters?: number;
  active?: boolean;
};

const allowedSeverity: Severity[] = ["low", "medium", "high", "critical"];

function validateZoneInput(body: ZoneBody) {
  const label = (body.label || "").trim();
  const floor = body.floor;
  const radiusMeters = body.radiusMeters;
  const lat = body.center?.lat;
  const lng = body.center?.lng;

  if (!label) return "label is required";
  if (typeof floor !== "number" || floor <= 0)
    return "floor must be a positive number";
  if (!body.severity || !allowedSeverity.includes(body.severity)) {
    return "severity must be low|medium|high|critical";
  }
  if (typeof lat !== "number" || typeof lng !== "number") {
    return "center.lat and center.lng are required";
  }
  if (typeof radiusMeters !== "number" || radiusMeters < 1) {
    return "radiusMeters must be >= 1";
  }

  return null;
}

export async function GET() {
  return NextResponse.json({ dangerZones: listDangerZones() });
}

export async function POST(request: Request) {
  let body: ZoneBody;

  try {
    body = (await request.json()) as ZoneBody;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON payload" },
      { status: 400 },
    );
  }

  const error = validateZoneInput(body);
  if (error) return NextResponse.json({ error }, { status: 400 });

  const zone = upsertDangerZone({
    floor: body.floor!,
    label: body.label!.trim(),
    severity: body.severity!,
    center: {
      lat: body.center!.lat!,
      lng: body.center!.lng!,
    },
    radiusMeters: body.radiusMeters!,
    active: body.active ?? true,
  });

  return NextResponse.json({ zone }, { status: 201 });
}

export async function PATCH(request: Request) {
  let body: ZoneBody;

  try {
    body = (await request.json()) as ZoneBody;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON payload" },
      { status: 400 },
    );
  }

  const id = (body.id || "").trim();
  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const error = validateZoneInput(body);
  if (error) return NextResponse.json({ error }, { status: 400 });

  const zone = upsertDangerZone({
    id,
    floor: body.floor!,
    label: body.label!.trim(),
    severity: body.severity!,
    center: {
      lat: body.center!.lat!,
      lng: body.center!.lng!,
    },
    radiusMeters: body.radiusMeters!,
    active: body.active ?? true,
  });

  return NextResponse.json({ zone });
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = (searchParams.get("id") || "").trim();

  if (!id) {
    return NextResponse.json(
      { error: "id query param is required" },
      { status: 400 },
    );
  }

  const removed = deleteDangerZone(id);
  if (!removed) {
    return NextResponse.json(
      { error: "Danger zone not found" },
      { status: 404 },
    );
  }

  return NextResponse.json({ ok: true });
}
