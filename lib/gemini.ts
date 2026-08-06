/**
 * Configure the model with System Instructions and JSON Mode.
 * This is a mocked placeholder implementation preparing for Groq integration.
 */
export function getGeminiModel() {
  throw new Error("Gemini AI is not configured.");
}

/**
 * 1. Analyze Media for Hazards
 */
export async function analyzeMedia(mediaBase64: string, mimeType: string) {
  return {
    hazard: "unknown",
    severity: 5,
    detail: "AI Engine Offline",
    summary: "Visual analysis unavailable."
  };
}

/**
 * 2. Synthesize Reports
 */
export async function synthesizeReports(
  reports: { text: string; room: string; timestamp: string }[],
) {
  return {
    type: "unknown",
    location: "Multi-floor",
    trapped: 0,
    summary: "Reports indicate generalized emergency."
  };
}

/**
 * 3. Translate Emergency Message
 */
export async function translateMessage(
  message: string,
  targetLanguage: string,
): Promise<string> {
  return message;
}
