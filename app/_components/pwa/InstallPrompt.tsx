"use client";

import { useEffect, useState } from "react";
import { Download, Sparkles, X } from "lucide-react";
import Button from "@/app/_components/ui/Button";
import Card from "@/app/_components/ui/Card";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
      setVisible(true);
    };

    const onAppInstalled = () => {
      setDeferredPrompt(null);
      setVisible(false);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, []);

  if (!visible || !deferredPrompt) return null;

  const handleInstall = async () => {
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setVisible(false);
  };

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 sm:left-auto sm:right-4 sm:max-w-md">
      <Card variant="elevated" className="space-y-4 border-brand/30 shadow-[var(--glow-brand)]">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-brand/15 p-2 text-brand-light">
              <Sparkles size={18} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-text-primary">Install GuardianLink</h2>
              <p className="mt-1 text-sm text-text-secondary">
                Add the crisis console to the home screen for instant access during an emergency.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setVisible(false)}
            className="rounded-lg p-1 text-text-muted transition hover:bg-surface-elevated hover:text-text-primary"
            aria-label="Dismiss install prompt"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button variant="primary" icon={<Download size={16} />} onClick={handleInstall}>
            Install App
          </Button>
          <Button variant="ghost" onClick={() => setVisible(false)}>
            Not now
          </Button>
        </div>
      </Card>
    </div>
  );
}
