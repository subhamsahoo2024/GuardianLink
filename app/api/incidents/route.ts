import { NextResponse } from "next/server";
import { listIncidents, updateIncidentStatus } from "@/lib/staff/store";
import { IncidentStatus } from "@/lib/staff/types";

type PatchBody = {
  incidentId?: string;
  status?: IncidentStatus;
  note?: string;
};

const allowedStatus: IncidentStatus[] = [
  "new",
  "investigating",
  "contained",
  "resolved",
];

export async function GET() {
  return NextResponse.json({ incidents: listIncidents() });
}

export async function PATCH(request: Request) {
  let body: PatchBody;

  try {
    body = (await request.json()) as PatchBody;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON payload" },
      { status: 400 },
    );
  }

  const incidentId = (body.incidentId || "").trim();
  const note = (body.note || "").trim();

  if (!incidentId) {
    return NextResponse.json(
      { error: "incidentId is required" },
      { status: 400 },
    );
  }

  if (!body.status || !allowedStatus.includes(body.status)) {
    return NextResponse.json(
      { error: "status must be one of new|investigating|contained|resolved" },
      { status: 400 },
    );
  }

  const updated = updateIncidentStatus(
    incidentId,
    body.status,
    note || undefined,
  );
  if (!updated) {
    return NextResponse.json({ error: "Incident not found" }, { status: 404 });
  }

  return NextResponse.json({ incident: updated });
}
