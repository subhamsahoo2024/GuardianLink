import { GoogleGenerativeAI } from "@google/generative-ai";
import { logAiDecision } from "@/lib/ai/audit";
import { scrubPII } from "@/lib/ai/privacy";

const apiKey = process.env.GOOGLE_GEMINI_API_KEY;

if (!apiKey) {
  console.warn(
    "GOOGLE_GEMINI_API_KEY is not set. AI features will be unavailable.",
  );
}

const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

/**
 * Configure the model with System Instructions and JSON Mode.
 */
export function getGeminiModel(
  systemInstruction: string,
  isJson: boolean = false,
) {
  if (!genAI) {
    throw new Error("Gemini AI is not configured.");
  }

  return genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    systemInstruction, // Set the "personality" here
    generationConfig: isJson
      ? { responseMimeType: "application/json" }
      : undefined,
  });
}

/**
 * 1. Analyze Media for Hazards
 */
export async function analyzeMedia(mediaBase64: string, mimeType: string) {
  // Use System Instructions for the "Role"
  const systemPrompt =
    "You are an emergency response AI. Analyze distress media and identify hazards accurately and concisely.";
  const model = getGeminiModel(systemPrompt, true);

  const userPrompt = `Analyze this media. Respond with this JSON structure:
  {
    "hazard": "fire|flood|structural|medical|smoke|chemical|unknown",
    "severity": number (1-10),
    "detail": "short string",
    "summary": "1 sentence description"
  }
  IMPORTANT: No PII (names, faces, IDs).`;

  try {
    const result = await model.generateContent([
      { inlineData: { mimeType, data: mediaBase64 } },
      { text: userPrompt },
    ]);

    const text = result.response.text();
    const parsed = JSON.parse(text); // No Regex needed with JSON Mode!

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
  } catch (error) {
    console.error("Gemini Triage Error:", error);
    return {
      hazard: "unknown",
      severity: 5,
      detail: "Analysis failed",
      summary: "Visual analysis unavailable.",
    };
  }
}

/**
 * 2. Synthesize Reports
 */
export async function synthesizeReports(
  reports: { text: string; room: string; timestamp: string }[],
) {
  const systemPrompt =
    "You are a crisis command center AI. Synthesize multiple distress signals into a tactical summary for first responders.";
  const model = getGeminiModel(systemPrompt, true);

  const reportText = reports
    .map((r) => {
      const scrubbed = scrubPII(r.text);
      return `[Room ${r.room}]: ${scrubbed.text}`;
    })
    .join("\n");

  const userPrompt = `Synthesize these reports into this JSON format:
  {
    "type": "fire|flood|structural|medical|chemical|unknown",
    "location": "primary location",
    "trapped": number,
    "summary": "3 sentences max"
  }
  
  Reports:
  ${reportText}`;

  try {
    const result = await model.generateContent(userPrompt);
    const text = result.response.text();
    return JSON.parse(text);
  } catch {
    return {
      type: "unknown",
      location: "Multi-floor",
      trapped: 0,
      summary: "Reports indicate generalized emergency.",
    };
  }
}

/**
 * 3. Translate Emergency Message
 */
export async function translateMessage(
  message: string,
  targetLanguage: string,
): Promise<string> {
  // Use System Instruction to set the tone - VERY IMPORTANT FOR TRANSLATION
  const systemPrompt = `You are an expert emergency translator. Translate alerts to ${targetLanguage}. 
  Maintain urgency, technical accuracy, and a calm, authoritative tone. Return ONLY the translation.`;

  const model = getGeminiModel(systemPrompt, false);
  const scrubbed = scrubPII(message);

  try {
    const result = await model.generateContent(scrubbed.text);
    const translatedText = result.response.text().trim();

    logAiDecision({
      operation: "translation",
      model: "gemini-2.0-flash",
      provider: "gemini",
      inputSize: message.length,
      outputSize: translatedText.length,
      redactions: scrubbed.redactionCount,
      success: true,
      details: `Translated to ${targetLanguage}.`,
    });

    return translatedText;
  } catch (error) {
    console.error("Translation Error:", error);
    return message; // Return original if translation fails
  }
}
