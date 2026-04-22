import { NextResponse } from "next/server";
import { analyzeMedia } from "@/lib/gemini";
import { logAiDecision } from "@/lib/ai/audit";
import { scrubPII } from "@/lib/ai/privacy";

type TriageRequestBody = {
  roomId?: string;
  message?: string;
  media?: {
    base64?: string;
    mimeType?: string;
  };
};

type Hazard =
  | "fire"
  | "flood"
  | "structural"
  | "medical"
  | "smoke"
  | "chemical"
  | "unknown";

function heuristicClassify(message: string): {
  hazard: Hazard;
  severity: number;
  detail: string;
  summary: string;
} {
  const text = message.toLowerCase();

  if (/(fire|smoke|burn|flame|ash)/.test(text)) {
    return {
      hazard: text.includes("smoke") ? "smoke" : "fire",
      severity: 8,
      detail: "Possible active fire/smoke condition",
      summary: "Text indicates fire or smoke conditions near guest location.",
    };
  }

  if (/(flood|water|leak|sprinkler)/.test(text)) {
    return {
      hazard: "flood",
      severity: 6,
      detail: "Water ingress or flooding risk",
      summary: "Text indicates flooding or heavy leakage in affected area.",
    };
  }

  if (/(collapse|structural|ceiling|crack|debris)/.test(text)) {
    return {
      hazard: "structural",
      severity: 9,
      detail: "Potential structural integrity issue",
      summary: "Text indicates structural damage or collapse signals.",
    };
  }

  if (/(medical|injury|bleeding|unconscious|breathing)/.test(text)) {
    return {
      hazard: "medical",
      severity: 7,
      detail: "Medical emergency indicated",
      summary: "Text indicates injury or urgent medical support need.",
    };
  }

  if (/(gas|chemical|toxic|odor|smell)/.test(text)) {
    return {
      hazard: "chemical",
      severity: 8,
      detail: "Potential gas or chemical leak",
      summary: "Text indicates gas or chemical hazard near the room.",
    };
  }

  return {
    hazard: "unknown",
    severity: 5,
    detail: "Insufficient signal in textual report",
    summary: "Unable to classify hazard from text with high confidence.",
  };
}

export async function POST(request: Request) {
  let body: TriageRequestBody;

  try {
    body = (await request.json()) as TriageRequestBody;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON payload" },
      { status: 400 },
    );
  }

  const roomId = (body.roomId || "").trim();
  const message = (body.message || "").trim();
  const mediaBase64 = body.media?.base64 || "";
  const mimeType = body.media?.mimeType || "application/octet-stream";

  if (!roomId) {
    return NextResponse.json({ error: "roomId is required" }, { status: 400 });
  }

  if (!message && !mediaBase64) {
    return NextResponse.json(
      { error: "Provide message or media.base64 for triage" },
      { status: 400 },
    );
  }

  const scrubbed = scrubPII(message);

  if (mediaBase64) {
    try {
      const mediaResult = await analyzeMedia(mediaBase64, mimeType);
      return NextResponse.json({
        triage: {
          roomId,
          hazard: mediaResult.hazard,
          severity: Math.max(
            1,
            Math.min(10, Number(mediaResult.severity) || 5),
          ),
          detail: mediaResult.detail,
          summary: mediaResult.summary,
          source: "multimodal",
          redactions: scrubbed.redactionCount,
          analyzedAt: new Date().toISOString(),
        },
      });
    } catch {
      // Fall through to text heuristic with audit logging.
    }
  }

  const heuristic = heuristicClassify(scrubbed.text);

  logAiDecision({
    operation: "triage",
    model: "heuristic-v1",
    provider: "fallback",
    inputSize: scrubbed.text.length,
    outputSize: JSON.stringify(heuristic).length,
    redactions: scrubbed.redactionCount,
    success: true,
    details: "Heuristic fallback triage used.",
  });

  return NextResponse.json({
    triage: {
      roomId,
      ...heuristic,
      source: "text-fallback",
      redactions: scrubbed.redactionCount,
      analyzedAt: new Date().toISOString(),
    },
  });
}
