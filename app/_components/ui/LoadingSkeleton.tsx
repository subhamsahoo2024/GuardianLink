import React from "react";

interface LoadingSkeletonProps {
  lines?: number;
  className?: string;
  variant?: "text" | "card" | "circle" | "bar";
}

export default function LoadingSkeleton({
  lines = 3,
  className = "",
  variant = "text",
}: LoadingSkeletonProps) {
  if (variant === "card") {
    return (
      <div className={`rounded-2xl animate-shimmer h-48 ${className}`} />
    );
  }

  if (variant === "circle") {
    return (
      <div
        className={`rounded-full animate-shimmer h-12 w-12 ${className}`}
      />
    );
  }

  if (variant === "bar") {
    return (
      <div className={`rounded-xl animate-shimmer h-8 ${className}`} />
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="animate-shimmer rounded-lg h-4"
          style={{ width: `${85 - i * 15}%` }}
        />
      ))}
    </div>
  );
}
