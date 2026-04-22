import { NextResponse } from "next/server";

type TranslateRequestBody = {
  text?: string;
  targetLanguage?: string;
  sourceLanguage?: string;
};

type GoogleTranslateResponse = {
  data?: {
    translations?: Array<{ translatedText?: string }>;
  };
};

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

  if (targetLanguage.toLowerCase().startsWith("en")) {
    return NextResponse.json({ translatedText: text, translated: false });
  }

  const apiKey = process.env.GOOGLE_CLOUD_TRANSLATION_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ translatedText: text, translated: false });
  }

  try {
    const response = await fetch(
      `https://translation.googleapis.com/language/translate/v2?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          q: text,
          target: targetLanguage,
          source: sourceLanguage || undefined,
          format: "text",
        }),
      },
    );

    if (!response.ok) {
      return NextResponse.json({ translatedText: text, translated: false });
    }

    const payload = (await response.json()) as GoogleTranslateResponse;
    const translatedText =
      payload.data?.translations?.[0]?.translatedText || text;

    return NextResponse.json({
      translatedText,
      translated: translatedText !== text,
    });
  } catch {
    return NextResponse.json({ translatedText: text, translated: false });
  }
}
