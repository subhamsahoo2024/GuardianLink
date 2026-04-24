"use client";

import { useEffect } from "react";

export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    const isProduction = process.env.NODE_ENV === "production";

    if (!isProduction) {
      const teardown = async () => {
        try {
          const registrations =
            await navigator.serviceWorker.getRegistrations();
          await Promise.all(
            registrations.map((registration) => registration.unregister()),
          );

          const cacheKeys = await caches.keys();
          const appCaches = cacheKeys.filter((key) =>
            key.startsWith("guardianlink-"),
          );
          await Promise.all(appCaches.map((key) => caches.delete(key)));
        } catch {
          // Dev cleanup failures are non-fatal.
        }
      };

      void teardown();
      return;
    }

    const register = async () => {
      try {
        await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      } catch {
        // Registration failures are non-fatal; the app still works online.
      }
    };

    void register();
  }, []);

  return null;
}
