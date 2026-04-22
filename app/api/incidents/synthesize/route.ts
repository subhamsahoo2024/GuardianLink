import { NextResponse } from "next/server";
import { clusterReports, dedupeReports } from "@/lib/ai/synthesis";
import { logAiDecision } from "@/lib/ai/audit";
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
  const selectedReportsInput =
    body.reportIds && body.reportIds.length > 0
      ? availableReports.filter((report) => body.reportIds?.includes(report.id))
      : availableReports;

  if (selectedReportsInput.length === 0) {
    return NextResponse.json(
      { error: "No reports available to synthesize" },
      { status: 400 },
    );
  }

  const deduped = dedupeReports(selectedReportsInput);
  const clusters = clusterReports(deduped.dedupedReports);
  const synthesizedIncidents = [];

  for (const cluster of clusters) {
    try {
      const incident = await synthesizeIncidentFromReports(cluster.reports);
      synthesizedIncidents.push({
        incident,
        ai: true,
        clusterId: cluster.clusterId,
        representativeKeywords: cluster.representativeKeywords,
      });
    } catch {
      const incident = createFallbackIncident(cluster.reports);
      logAiDecision({
        operation: "incident_synthesis",
        model: "gemini-2.0-flash",
        provider: "fallback",
        inputSize: cluster.reports.map((item) => item.text).join(" ").length,
        outputSize: incident.summary.length,
        redactions: 0,
        success: false,
        details: `Fallback incident synthesis used for ${cluster.clusterId}.`,
      });
      synthesizedIncidents.push({
        incident,
        ai: false,
        clusterId: cluster.clusterId,
        representativeKeywords: cluster.representativeKeywords,
      });
    }
  }

  return NextResponse.json({
    incidents: synthesizedIncidents,
    dedupe: {
      inputCount: selectedReportsInput.length,
      dedupedCount: deduped.dedupedReports.length,
      duplicateMap: deduped.duplicateMap,
    },
  });
}
