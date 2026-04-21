"use client";

import React from "react";

interface AlertBannerProps {
  messages: string[];
  variant?: "danger" | "warning" | "info";
  className?: string;
}

const variantStyles: Record<string, { bg: string; text: string; icon: string }> = {
  danger: {
    bg: "bg-danger/10 border-b border-danger/30",
    text: "text-danger-light",
    icon: "🚨",
  },
  warning: {
    bg: "bg-warning/10 border-b border-warning/30",
    text: "text-warning-light",
    icon: "⚠️",
  },
  info: {
    bg: "bg-brand/10 border-b border-brand/30",
    text: "text-brand-light",
    icon: "ℹ️",
  },
};

export default function AlertBanner({
  messages,
  variant = "danger",
  className = "",
}: AlertBannerProps) {
  const style = variantStyles[variant];
  const fullText = messages.join("  •  ");

  return (
    <div
      className={`
        relative overflow-hidden py-2.5 ${style.bg} ${className}
      `}
      role="alert"
      aria-live="polite"
    >
      <div className="animate-ticker whitespace-nowrap">
        <span className={`text-sm font-medium ${style.text}`}>
          {style.icon} {fullText} {style.icon} {fullText}
        </span>
      </div>
    </div>
  );
}
