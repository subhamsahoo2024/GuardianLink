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
      title="Staff Command Center failed to load"
      description={error.message || "The operations dashboard could not be rendered."}
      reset={reset}
    />
  );
}
