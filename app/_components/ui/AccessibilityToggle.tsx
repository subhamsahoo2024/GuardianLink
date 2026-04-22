"use client";

import { useEffect, useState } from "react";
import { Contrast } from "lucide-react";

const STORAGE_KEY = "guardianlink-high-contrast";

function applyContrast(enabled: boolean) {
  document.documentElement.dataset.highContrast = enabled ? "true" : "false";
}

export default function AccessibilityToggle() {
  const [enabled, setEnabled] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }

    return window.localStorage.getItem(STORAGE_KEY) === "true";
  });

  useEffect(() => {
    applyContrast(enabled);

    const onStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY) {
        const next = event.newValue === "true";
        setEnabled(next);
        applyContrast(next);
      }
    };

    window.addEventListener("storage", onStorage);

    return () => window.removeEventListener("storage", onStorage);
  }, [enabled]);

  const toggle = () => {
    setEnabled((current) => {
      const next = !current;
      window.localStorage.setItem(STORAGE_KEY, String(next));
      applyContrast(next);
      return next;
    });
  };

  return (
    <button
      type="button"
      onClick={toggle}
      className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition-colors ${
        enabled
          ? "border-safe/40 bg-safe/15 text-safe-light"
          : "border-border text-text-secondary hover:border-brand/20 hover:bg-surface-elevated hover:text-text-primary"
      }`}
      aria-pressed={enabled}
      aria-label={enabled ? "Disable high contrast mode" : "Enable high contrast mode"}
      title="High contrast emergency mode"
    >
      <Contrast size={14} />
      <span className="hidden sm:inline">{enabled ? "High contrast on" : "High contrast"}</span>
    </button>
  );
}
