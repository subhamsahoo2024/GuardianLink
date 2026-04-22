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
      title="Guest Survival Hub failed to load"
      description={error.message || "The guest emergency view could not be displayed."}
      reset={reset}
    />
  );
}
