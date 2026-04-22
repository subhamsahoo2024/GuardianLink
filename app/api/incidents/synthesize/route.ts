import { NextResponse } from "next/server";
import {
  createFallbackIncident,
  listReports,
  synthesizeIncidentFromReports,
} from "@/lib/staff/store";

type SynthesizeBody = {
  reportIds?: string[];
};

export async function POST(request: Request) {
  let body: SynthesizeBody = {};

  try {
    body = (await request.json()) as SynthesizeBody;
  } catch {
    // Allow empty body and synthesize from all reports.
  }

  const availableReports = listReports();
  const selectedReports =
    body.reportIds && body.reportIds.length > 0
      ? availableReports.filter((report) => body.reportIds?.includes(report.id))
      : availableReports;

  if (selectedReports.length === 0) {
    return NextResponse.json(
      { error: "No reports available to synthesize" },
      { status: 400 },
    );
  }

  try {
    const incident = await synthesizeIncidentFromReports(selectedReports);
    return NextResponse.json({ incident, ai: true });
  } catch {
    const incident = createFallbackIncident(selectedReports);
    return NextResponse.json({ incident, ai: false });
  }
}
