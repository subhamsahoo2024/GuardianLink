"use client";

import RouteErrorView from "@/app/_components/fallbacks/RouteErrorView";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorView
      title="GuardianLink hit a rendering error"
      description={error.message || "An unexpected issue interrupted the crisis shell."}
      reset={reset}
    />
  );
}
