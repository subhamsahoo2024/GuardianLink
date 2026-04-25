"use client";

import { useEffect, useMemo, useState } from "react";
import {
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
  type DocumentData,
} from "firebase/firestore";
import Badge from "@/app/_components/ui/Badge";
import Button from "@/app/_components/ui/Button";
import Card from "@/app/_components/ui/Card";
import { db } from "@/lib/firebase";

type BroadcastItem = {
  id: string;
  message: string;
  target: "all" | "staff" | "guests";
  createdAt: string;
};

const languageOptions: Array<{ code: string; label: string }> = [
  { code: "en", label: "English" },
  { code: "es", label: "Spanish" },
  { code: "zh", label: "Mandarin Chinese" },
  { code: "fr", label: "French" },
  { code: "ar", label: "Arabic" },
  { code: "ru", label: "Russian" },
  { code: "hi", label: "Hindi" },
  { code: "ja", label: "Japanese" },
  { code: "ta", label: "Tamil" },
];

function languageDisplayValue(code: string) {
  const matched = languageOptions.find(
    (option) => option.code.toLowerCase() === code.toLowerCase(),
  );
  if (!matched) {
    return code;
  }
  return `${matched.label} (${matched.code})`;
}

function parseLanguageCode(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const lower = trimmed.toLowerCase();
  const direct = languageOptions.find((option) => {
    return (
      option.code.toLowerCase() === lower ||
      option.label.toLowerCase() === lower ||
      `${option.label.toLowerCase()} (${option.code.toLowerCase()})` === lower
    );
  });
  if (direct) {
    return direct.code;
  }

  const wrappedCode = lower.match(/\(([a-z]{2,3}(?:-[a-z]{2,4})?)\)$/i);
  if (wrappedCode?.[1]) {
    return wrappedCode[1];
  }

  if (/^[a-z]{2,3}(?:-[a-z]{2,4})?$/i.test(trimmed)) {
    return trimmed;
  }

  return null;
}

function normalizeLanguage(language: string) {
  const trimmed = language.trim();
  if (!trimmed) return "en";
  const lower = trimmed.toLowerCase();
  const matched = languageOptions.find((option) => {
    const code = option.code.toLowerCase();
    return lower === code || lower.startsWith(`${code}-`);
  });
  return matched ? matched.code : "en";
}

export default function MultilingualEmergencyTicker() {
  const [broadcasts, setBroadcasts] = useState<BroadcastItem[]>([]);
  const [selectedMessageId, setSelectedMessageId] = useState<string>("");
  const [translatedAlert, setTranslatedAlert] = useState<string>("");
  const [targetLanguage, setTargetLanguage] = useState(() => {
    if (typeof navigator === "undefined") {
      return "en";
    }
    return normalizeLanguage(navigator.language);
  });
  const [languageInput, setLanguageInput] = useState(() => {
    if (typeof navigator === "undefined") {
      return languageDisplayValue("en");
    }
    return languageDisplayValue(normalizeLanguage(navigator.language));
  });
  const [isTranslating, setIsTranslating] = useState(false);
  const [translationError, setTranslationError] = useState<string | null>(null);
  const [translationRequestCount, setTranslationRequestCount] = useState(0);
  const [deletingMessageId, setDeletingMessageId] = useState<string>("");

  function mapGuestVisibleMessages(
    docs: Array<{ id: string; data: () => DocumentData }>,
  ) {
    const result: BroadcastItem[] = [];

    for (const doc of docs) {
      const docData = doc.data();
      const target =
        (typeof docData.target === "string" && docData.target) ||
        (typeof docData.audience === "string" && docData.audience) ||
        "all";

      if (target !== "all" && target !== "guests") {
        continue;
      }

      const message =
        (typeof docData.message === "string" && docData.message.trim()) ||
        (typeof docData.text === "string" && docData.text.trim()) ||
        "";

      if (message) {
        const createdAt =
          typeof docData.createdAt === "string"
            ? docData.createdAt
            : new Date(0).toISOString();

        result.push({
          id: doc.id,
          message,
          target: target as "all" | "staff" | "guests",
          createdAt,
        });
      }
    }

    return result;
  }

  const sourceAlert = useMemo(() => {
    const selected = broadcasts.find((item) => item.id === selectedMessageId);
    return selected?.message || "";
  }, [broadcasts, selectedMessageId]);

  useEffect(() => {
    const broadcastsRef = collection(db, "broadcasts");
    const latestBroadcastQuery = query(
      broadcastsRef,
      orderBy("createdAt", "desc"),
      limit(12),
    );

    const unsubscribe = onSnapshot(
      latestBroadcastQuery,
      (snapshot) => {
        const items = mapGuestVisibleMessages(snapshot.docs);
        setBroadcasts(items);
        setSelectedMessageId((current) => {
          if (!items.length) return "";
          if (current && items.some((item) => item.id === current)) {
            return current;
          }
          return items[0].id;
        });
      },
      () => {
        setBroadcasts([]);
        setSelectedMessageId("");
      },
    );

    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    let active = true;

    async function runTranslation() {
      if (!sourceAlert) {
        setTranslatedAlert("");
        setTranslationError(null);
        setIsTranslating(false);
        return;
      }

      if (targetLanguage.toLowerCase().startsWith("en")) {
        setTranslatedAlert(sourceAlert);
        setTranslationError(null);
        return;
      }

      setIsTranslating(true);
      setTranslationError(null);

      try {
        const response = await fetch("/api/translate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            text: sourceAlert,
            targetLanguage,
          }),
        });

        if (!response.ok) {
          throw new Error("Translation API failed");
        }

        const payload = (await response.json()) as {
          translatedText?: string;
          translated?: boolean;
          error?: string;
        };
        if (active) {
          setTranslatedAlert(payload.translatedText || sourceAlert);
          if (payload.translated === false) {
            setTranslationError(
              payload.error ||
                "Showing source language due to translation issue.",
            );
          }
        }
      } catch {
        if (active) {
          setTranslatedAlert(sourceAlert);
          setTranslationError(
            "Showing source language due to translation issue.",
          );
        }
      } finally {
        if (active) {
          setIsTranslating(false);
        }
      }
    }

    runTranslation();

    return () => {
      active = false;
    };
  }, [sourceAlert, targetLanguage, translationRequestCount]);

  const statusLabel = useMemo(() => {
    if (isTranslating) return "Translating...";
    if (translationError) return "Fallback";
    if (targetLanguage.toLowerCase().startsWith("en")) return "English";
    return targetLanguage;
  }, [isTranslating, targetLanguage, translationError]);

  function handleLanguageInputChange(value: string) {
    setLanguageInput(value);
    setTranslationError(null);
  }

  function handleLanguageInputBlur() {
    const parsed = parseLanguageCode(languageInput);
    if (!parsed) {
      setLanguageInput(languageDisplayValue(targetLanguage));
      return;
    }
    setLanguageInput(languageDisplayValue(parsed));
  }

  function handleTranslateClick() {
    if (!sourceAlert) {
      setTranslationError("No broadcast message available to translate.");
      return;
    }

    const parsed = parseLanguageCode(languageInput);
    if (!parsed) {
      setTranslationError("Please choose a valid supported language.");
      setLanguageInput(languageDisplayValue(targetLanguage));
      return;
    }

    setTargetLanguage(parsed);
    setLanguageInput(languageDisplayValue(parsed));
    setTranslationError(null);
    setTranslationRequestCount((count) => count + 1);
  }

  async function handleDeleteMessage(id: string) {
    setDeletingMessageId(id);
    setTranslationError(null);

    try {
      const response = await fetch(
        `/api/broadcast?id=${encodeURIComponent(id)}`,
        {
          method: "DELETE",
        },
      );

      if (!response.ok) {
        throw new Error("Delete failed");
      }
    } catch {
      setTranslationError("Failed to delete message. Please try again.");
    } finally {
      setDeletingMessageId("");
    }
  }

  return (
    <Card variant="glass" padding="sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="text-sm font-semibold text-text-primary">
          Multilingual Emergency Ticker
        </div>
        <Badge
          variant={translationError ? "warning" : "info"}
          dot
          pulse={isTranslating}
        >
          {statusLabel}
        </Badge>
      </div>

      <div className="mb-3 space-y-1">
        <label
          htmlFor="ticker-language"
          className="text-xs font-semibold uppercase tracking-[0.12em] text-text-muted"
        >
          Language
        </label>
        <div className="flex flex-wrap gap-2 sm:flex-nowrap">
          <input
            id="ticker-language"
            list="ticker-language-options"
            value={languageInput}
            onChange={(event) => handleLanguageInputChange(event.target.value)}
            onBlur={handleLanguageInputBlur}
            placeholder="Search language or code (for example: Spanish or es)"
            className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text-primary outline-none ring-brand/40 transition focus:ring"
            aria-label="Search and select translation language"
          />
          <Button
            variant="primary"
            size="sm"
            loading={isTranslating}
            onClick={handleTranslateClick}
            className="whitespace-nowrap"
            aria-label="Translate ticker message"
          >
            Translate
          </Button>
        </div>
        <datalist id="ticker-language-options">
          {languageOptions.map((option) => (
            <option
              key={option.code}
              value={`${option.label} (${option.code})`}
            />
          ))}
        </datalist>
      </div>

      <div className="rounded-xl border border-danger/30 bg-danger/10 px-3 py-3">
        {translatedAlert ? (
          <p className="text-sm font-medium text-danger-light">
            {translatedAlert}
          </p>
        ) : (
          <p className="text-sm text-text-muted">
            No broadcast messages available for guests.
          </p>
        )}
      </div>

      <div className="mt-4 space-y-2">
        <div className="text-xs font-semibold uppercase tracking-[0.12em] text-text-muted">
          Transmission history
        </div>
        {broadcasts.length === 0 ? (
          <div className="rounded-xl border border-border bg-surface px-3 py-3 text-sm text-text-muted">
            No transmitted messages yet.
          </div>
        ) : (
          broadcasts.map((item) => (
            <div
              key={item.id}
              className={`rounded-xl border px-3 py-3 ${
                item.id === selectedMessageId
                  ? "border-brand/40 bg-brand/10"
                  : "border-border bg-surface"
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedMessageId(item.id)}
                  className="flex-1 text-left"
                >
                  <p className="text-sm text-text-primary">{item.message}</p>
                  <p className="mt-1 text-xs text-text-muted">
                    {new Date(item.createdAt).toLocaleString()} - target:{" "}
                    {item.target}
                  </p>
                </button>
                <Button
                  variant="danger"
                  size="sm"
                  loading={deletingMessageId === item.id}
                  onClick={() => {
                    void handleDeleteMessage(item.id);
                  }}
                >
                  Delete
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      {translationError && (
        <p className="mt-3 text-xs text-warning-light">{translationError}</p>
      )}
    </Card>
  );
}
