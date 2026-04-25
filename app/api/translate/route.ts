import { NextResponse } from "next/server";
import { translateMessage } from "@/lib/gemini";

type TranslateRequestBody = {
  text?: string;
  targetLanguage?: string;
  sourceLanguage?: string;
};

const supportedTargets: Record<string, string> = {
  en: "English",
  es: "Spanish",
  zh: "Mandarin Chinese",
  fr: "French",
  ar: "Arabic",
  ru: "Russian",
  hi: "Hindi",
  ja: "Japanese",
  ta: "Tamil",
};

function normalizeTargetLanguage(input: string) {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const lower = trimmed.toLowerCase();

  // Accept either canonical code or region variant (for example: en-US).
  const byCode = Object.keys(supportedTargets).find(
    (code) => lower === code || lower.startsWith(`${code}-`),
  );
  if (byCode) {
    return byCode;
  }

  const byName = Object.entries(supportedTargets).find(
    ([, language]) => language.toLowerCase() === lower,
  );
  if (byName) {
    return byName[0];
  }

  return null;
}

export async function POST(request: Request) {
  let body: TranslateRequestBody;

  try {
    body = (await request.json()) as TranslateRequestBody;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON payload" },
      { status: 400 },
    );
  }

  const text = (body.text || "").trim();
  const targetLanguage = (body.targetLanguage || "").trim();
  const sourceLanguage = (body.sourceLanguage || "").trim();

  if (!text) {
    return NextResponse.json({ error: "text is required" }, { status: 400 });
  }

  if (!targetLanguage) {
    return NextResponse.json(
      { error: "targetLanguage is required" },
      { status: 400 },
    );
  }

  const normalizedTarget = normalizeTargetLanguage(targetLanguage);
  if (!normalizedTarget) {
    return NextResponse.json(
      {
        error:
          "targetLanguage must be one of en, es, zh, fr, ar, ru, hi, ja, ta",
      },
      { status: 400 },
    );
  }

  if (normalizedTarget === "en") {
    return NextResponse.json({ translatedText: text, translated: false });
  }

  if (!process.env.GOOGLE_GEMINI_API_KEY) {
    return NextResponse.json(
      {
        translatedText: text,
        translated: false,
        error: "Gemini translation is not configured",
      },
      { status: 503 },
    );
  }

  try {
    const hintPrefix = sourceLanguage
      ? `Source language hint: ${sourceLanguage}.\n\n`
      : "";
    const translatedText = await translateMessage(
      `${hintPrefix}${text}`,
      supportedTargets[normalizedTarget],
    );

    const didTranslate =
      translatedText.trim().toLowerCase() !== text.trim().toLowerCase();

    return NextResponse.json({
      translatedText,
      translated: didTranslate,
    });
  } catch {
    return NextResponse.json(
      {
        translatedText: text,
        translated: false,
        error: "Gemini translation failed",
      },
      { status: 502 },
    );
  }
}
