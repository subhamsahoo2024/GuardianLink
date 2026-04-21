import { GoogleGenerativeAI } from "@google/generative-ai";

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

  const result = await model.generateContent([
    {
      inlineData: {
        mimeType,
        data: mediaBase64,
      },
    },
    {
      text: `You are an emergency response AI analyzing a distress signal from a hotel guest.
Analyze this media and respond with ONLY valid JSON (no markdown):
{
  "hazard": "fire|flood|structural|medical|smoke|chemical|unknown",
  "severity": <1-10>,
  "detail": "<specific type, e.g. electrical fire, gas leak>",
  "summary": "<1 sentence description of what you see>"
}
IMPORTANT: Do NOT include any personally identifiable information (PII) in your response.`,
    },
  ]);

  const text = result.response.text();
  try {
    return JSON.parse(text.replace(/```json?\n?/g, "").replace(/```/g, "").trim());
  } catch {
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

  const reportText = reports
    .map(
      (r) =>
        `[Room ${r.room} at ${r.timestamp}]: ${r.text}`
    )
    .join("\n");

  const result = await model.generateContent(
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
IMPORTANT: Do NOT include any personally identifiable information (PII).`
  );

  const text = result.response.text();
  try {
    return JSON.parse(text.replace(/```json?\n?/g, "").replace(/```/g, "").trim());
  } catch {
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

  const result = await model.generateContent(
    `Translate the following emergency alert to ${targetLanguage}. 
Keep the translation urgent and clear. Return ONLY the translated text, nothing else.

Message: ${message}`
  );

  return result.response.text().trim();
}

export default genAI;
