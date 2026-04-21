import React from "react";

type StatusType = "safe" | "danger" | "warning" | "no-response" | "critical";

interface StatusPulseProps {
  status: StatusType;
  size?: "sm" | "md" | "lg";
  label?: string;
  className?: string;
}

const statusColors: Record<StatusType, string> = {
  safe: "bg-safe",
  danger: "bg-danger",
  warning: "bg-warning",
  "no-response": "bg-no-response",
  critical: "bg-critical",
};

const pulseColors: Record<StatusType, string> = {
  safe: "bg-safe/60",
  danger: "bg-danger/60",
  warning: "bg-warning/60",
  "no-response": "bg-no-response/40",
  critical: "bg-critical/60",
};

const sizeMap: Record<string, { dot: string; ping: string; text: string }> = {
  sm: { dot: "h-2 w-2", ping: "h-2 w-2", text: "text-xs" },
  md: { dot: "h-3 w-3", ping: "h-3 w-3", text: "text-sm" },
  lg: { dot: "h-4 w-4", ping: "h-4 w-4", text: "text-base" },
};

export default function StatusPulse({
  status,
  size = "md",
  label,
  className = "",
}: StatusPulseProps) {
  const s = sizeMap[size];
  const shouldPulse = status === "danger" || status === "critical";

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <span className="relative flex">
        {shouldPulse && (
          <span
            className={`
              absolute inline-flex rounded-full opacity-75 animate-ping
              ${s.ping} ${pulseColors[status]}
            `}
          />
        )}
        <span
          className={`
            relative inline-flex rounded-full
            ${s.dot} ${statusColors[status]}
          `}
        />
      </span>
      {label && (
        <span className={`font-medium text-text-secondary ${s.text}`}>
          {label}
        </span>
      )}
    </div>
  );
}
