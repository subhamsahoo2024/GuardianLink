import { NextResponse } from "next/server";
import Groq from "groq-sdk";

// Initialize Groq client
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY || "",
});

export async function POST(req: Request) {
  try {
    let sourceLang = "en";
    let targetLang = "es";
    let textToTranslate = "";
    let isAudio = false;
    let fileBlob: Blob | null = null;

    // 1. Input Extraction
    const contentType = req.headers.get("content-type") || "";
    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      sourceLang = (formData.get("sourceLang") as string) || "en";
      targetLang = (formData.get("targetLang") as string) || "es";

      const payload = formData.get("payload");
      if (payload instanceof Blob) {
        fileBlob = payload;
        isAudio = true;
      } else if (typeof payload === "string") {
        textToTranslate = payload;
      }
    } else {
      const body = await req.json();
      sourceLang = body.sourceLang || "en";
      targetLang = body.targetLang || "es";
      textToTranslate = body.payload || "";
    }

    // Step 1: Handle Audio transcription if received
    if (isAudio && fileBlob) {
      if (!process.env.GROQ_API_KEY) {
        throw new Error("GROQ_API_KEY is not configured.");
      }

      // Convert Blob to Buffer for Groq toFile helper
      const buffer = Buffer.from(await fileBlob.arrayBuffer());
      const file = await Groq.toFile(buffer, "audio.webm", {
        type: fileBlob.type || "audio/webm",
      });

      // Transcribe via Whisper
      const transcription = await groq.audio.transcriptions.create({
        file: file,
        model: "whisper-large-v3-turbo",
      });
      textToTranslate = transcription.text;
    }

    if (!textToTranslate.trim()) {
      return NextResponse.json({
        originalText: "",
        translatedText: "",
      });
    }

    // Step 2: Translate via Llama model
    const systemPrompt = `You are a high-speed emergency translation engine. Translate the following text from ${sourceLang} to ${targetLang}. Return ONLY the translated text. Do not add conversational filler, notes, or quotes.`;

    let translatedText = "";
    if (process.env.GROQ_API_KEY) {
      try {
        // Try meta-llama/llama-4-scout-17b-16e-instruct first
        const completion = await groq.chat.completions.create({
          model: "openai/gpt-oss-20b",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: textToTranslate },
          ],
        });
        translatedText = completion.choices[0]?.message?.content || "";
      } catch (e) {
        console.warn("Llama-4 Scout failed, falling back to Llama-3.1-8b-instant:", e);
        // Programmatic fallback to llama-3.1-8b-instant
        const completion = await groq.chat.completions.create({
          model: "llama-3.1-8b-instant",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: textToTranslate },
          ],
        });
        translatedText = completion.choices[0]?.message?.content || "";
      }
    } else {
      // Offline/Fallback simulation mode if no API key is present
      translatedText = `[GROQ OFFLINE TRANSLATION TO ${targetLang.toUpperCase()}] ${textToTranslate}`;
    }

    // Return final JSON response
    return NextResponse.json({
      originalText: textToTranslate,
      translatedText: translatedText.trim(),
    });
  } catch (error: any) {
    console.error("Groq Translator API Error:", error);
    return NextResponse.json(
      {
        originalText: "Audio input captured.",
        translatedText: "Translation service unavailable.",
        error: error.message || "Unknown error during Groq API process",
      },
      { status: 200 } // Return 200 with safe mock error texts to keep frontend from crashing
    );
  }
}
