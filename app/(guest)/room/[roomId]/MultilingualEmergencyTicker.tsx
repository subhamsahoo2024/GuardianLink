"use client";

import { useEffect, useMemo, useState } from "react";
import {
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
} from "firebase/firestore";
import AlertBanner from "@/app/_components/ui/AlertBanner";
import Badge from "@/app/_components/ui/Badge";
import Card from "@/app/_components/ui/Card";
import { db } from "@/lib/firebase";

const fallbackAlerts = [
  "Stay low if smoke is present and move toward marked exits.",
  "Keep your phone charged and location services enabled for responders.",
];

function normalizeLanguage(language: string) {
  const trimmed = language.trim();
  if (!trimmed) return "en";
  return trimmed;
}

export default function MultilingualEmergencyTicker() {
  const [sourceAlert, setSourceAlert] = useState<string>(fallbackAlerts[0]);
  const [translatedAlert, setTranslatedAlert] = useState<string>(
    fallbackAlerts[0],
  );
  const [targetLanguage] = useState(() => {
    if (typeof navigator === "undefined") {
      return "en";
    }
    return normalizeLanguage(navigator.language);
  });
  const [isTranslating, setIsTranslating] = useState(false);
  const [translationError, setTranslationError] = useState<string | null>(null);

  useEffect(() => {
    const broadcastsRef = collection(db, "broadcasts");
    const latestBroadcastQuery = query(
      broadcastsRef,
      orderBy("createdAt", "desc"),
      limit(1),
    );

    const unsubscribe = onSnapshot(
      latestBroadcastQuery,
      (snapshot) => {
        if (snapshot.empty) {
          setSourceAlert(fallbackAlerts[0]);
          return;
        }

        const docData = snapshot.docs[0].data();
        const message =
          (typeof docData.message === "string" && docData.message.trim()) ||
          (typeof docData.text === "string" && docData.text.trim()) ||
          fallbackAlerts[0];

        setSourceAlert(message);
      },
      () => {
        setSourceAlert(fallbackAlerts[1]);
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

        const payload = (await response.json()) as { translatedText?: string };
        if (active) {
          setTranslatedAlert(payload.translatedText || sourceAlert);
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
  }, [sourceAlert, targetLanguage]);

  const statusLabel = useMemo(() => {
    if (isTranslating) return "Translating...";
    if (translationError) return "Fallback";
    if (targetLanguage.toLowerCase().startsWith("en")) return "English";
    return targetLanguage;
  }, [isTranslating, targetLanguage, translationError]);

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

      <AlertBanner
        messages={[translatedAlert]}
        variant="danger"
        className="rounded-xl"
      />

      {translationError && (
        <p className="mt-3 text-xs text-warning-light">{translationError}</p>
      )}
    </Card>
  );
}
