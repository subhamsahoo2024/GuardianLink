import { NextResponse } from "next/server";
import { pushSessionMessage, translateBridgeText } from "@/lib/responder/store";

type TranslateBody = {
  sessionId?: string;
  text?: string;
  targetLanguage?: string;
  sourceLanguage?: string;
};

export async function POST(request: Request) {
  let body: TranslateBody;

  try {
    body = (await request.json()) as TranslateBody;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON payload" },
      { status: 400 },
    );
  }

  const sessionId = (body.sessionId || "").trim();
  const text = (body.text || "").trim();
  const targetLanguage = (body.targetLanguage || "en").trim();
  const sourceLanguage = (body.sourceLanguage || "auto").trim();

  if (!sessionId) {
    return NextResponse.json(
      { error: "sessionId is required" },
      { status: 400 },
    );
  }

  if (!text) {
    return NextResponse.json({ error: "text is required" }, { status: 400 });
  }

  const responderMessage = pushSessionMessage(sessionId, {
    speaker: "responder",
    text,
    translated: false,
  });

  const translation = await translateBridgeText(text, targetLanguage);

  const guestMessage = pushSessionMessage(sessionId, {
    speaker: "guest",
    text: translation.translatedText,
    translated: translation.translatedText !== text,
  });

  return NextResponse.json({
    sourceLanguage,
    translatedText: translation.translatedText,
    ai: translation.ai,
    messages: [responderMessage, guestMessage],
  });
}
