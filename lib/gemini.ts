import { GoogleGenerativeAI } from "@google/generative-ai";
import { logAiDecision } from "@/lib/ai/audit";
import { ensurePrivacyInstruction, scrubPII } from "@/lib/ai/privacy";

const apiKey = process.env.GOOGLE_GEMINI_API_KEY;

if (!apiKey) {
  console.warn(
    "GOOGLE_GEMINI_API_KEY is not set. AI features will be unavailable."
  );
}

const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

/**
 * Get the Gemini 2.0 Flash model for text/multimodal analysis.
 * Used for: incident synthesis, triage analysis, translations.
 */
export function getGeminiModel() {
  if (!genAI) {
    throw new Error("Gemini AI is not configured. Set GOOGLE_GEMINI_API_KEY.");
  }
  return genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
}

/**
 * Analyze a media file (image/video) for hazard detection.
 * Returns structured hazard assessment.
 */
export async function analyzeMedia(
  mediaBase64: string,
  mimeType: string
): Promise<{
  hazard: string;
  severity: number;
  detail: string;
  summary: string;
}> {
  const model = getGeminiModel();

  const prompt = ensurePrivacyInstruction(`You are an emergency response AI analyzing a distress signal from a hotel guest.
Analyze this media and respond with ONLY valid JSON (no markdown):
{
  "hazard": "fire|flood|structural|medical|smoke|chemical|unknown",
  "severity": <1-10>,
  "detail": "<specific type, e.g. electrical fire, gas leak>",
  "summary": "<1 sentence description of what you see>"
}
IMPORTANT: Do NOT include any personally identifiable information (PII) in your response.`);

  const result = await model.generateContent([
    {
      inlineData: {
        mimeType,
        data: mediaBase64,
      },
    },
    {
      text: prompt,
    },
  ]);

  const text = result.response.text();
  try {
    const parsed = JSON.parse(
      text.replace(/```json?\n?/g, "").replace(/```/g, "").trim(),
    );
    logAiDecision({
      operation: "triage",
      model: "gemini-2.0-flash",
      provider: "gemini",
      inputSize: mediaBase64.length,
      outputSize: text.length,
      redactions: 0,
      success: true,
      details: "Multimodal hazard analysis completed.",
    });
    return parsed;
  } catch {
    logAiDecision({
      operation: "triage",
      model: "gemini-2.0-flash",
      provider: "fallback",
      inputSize: mediaBase64.length,
      outputSize: text.length,
      redactions: 0,
      success: false,
      details: "Failed to parse model JSON output.",
    });
    return {
      hazard: "unknown",
      severity: 5,
      detail: "Unable to parse analysis",
      summary: text.slice(0, 200),
    };
  }
}

/**
 * Synthesize multiple SOS reports into a concise incident summary.
 */
export async function synthesizeReports(
  reports: { text: string; room: string; timestamp: string }[]
): Promise<{
  type: string;
  location: string;
  trapped: number;
  summary: string;
}> {
  const model = getGeminiModel();

  let redactions = 0;
  const reportText = reports
    .map((r) => {
      const scrubbed = scrubPII(r.text);
      redactions += scrubbed.redactionCount;
      return `[Room ${r.room} at ${r.timestamp}]: ${scrubbed.text}`;
    })
    .join("\n");

  const synthesisPrompt = ensurePrivacyInstruction(
    `You are a crisis command center AI. Synthesize these ${reports.length} distress reports into a single incident summary.

Reports:
${reportText}

Respond with ONLY valid JSON (no markdown):
{
  "type": "<fire|flood|structural|medical|chemical|unknown>",
  "location": "<primary location description>",
  "trapped": <estimated number of people needing help>,
  "summary": "<3 sentence maximum summary of the situation>"
}
IMPORTANT: Do NOT include any personally identifiable information (PII).`,
  );

  const result = await model.generateContent(synthesisPrompt);

  const text = result.response.text();
  try {
    const parsed = JSON.parse(
      text.replace(/```json?\n?/g, "").replace(/```/g, "").trim(),
    );
    logAiDecision({
      operation: "incident_synthesis",
      model: "gemini-2.0-flash",
      provider: "gemini",
      inputSize: reportText.length,
      outputSize: text.length,
      redactions,
      success: true,
      details: `Synthesized ${reports.length} reports.`,
    });
    return parsed;
  } catch {
    logAiDecision({
      operation: "incident_synthesis",
      model: "gemini-2.0-flash",
      provider: "fallback",
      inputSize: reportText.length,
      outputSize: text.length,
      redactions,
      success: false,
      details: "Failed to parse synthesis JSON output.",
    });
    return {
      type: "unknown",
      location: "Unknown",
      trapped: 0,
      summary: text.slice(0, 300),
    };
  }
}

/**
 * Translate an emergency message using Gemini.
 */
export async function translateMessage(
  message: string,
  targetLanguage: string
): Promise<string> {
  const model = getGeminiModel();

  const scrubbed = scrubPII(message);
  const prompt = ensurePrivacyInstruction(`Translate the following emergency alert to ${targetLanguage}. 
Keep the translation urgent and clear. Return ONLY the translated text, nothing else.

Message: ${scrubbed.text}`);

  const result = await model.generateContent(prompt);

  const translatedText = result.response.text().trim();

  logAiDecision({
    operation: "translation",
    model: "gemini-2.0-flash",
    provider: "gemini",
    inputSize: message.length,
    outputSize: translatedText.length,
    redactions: scrubbed.redactionCount,
    success: true,
    details: `Translated emergency message to ${targetLanguage}.`,
  });

  return translatedText;
}

export default genAI;
