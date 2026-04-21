import React from "react";

type BadgeVariant = "safe" | "danger" | "warning" | "info" | "neutral";

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  pulse?: boolean;
  className?: string;
  dot?: boolean;
}

const variantStyles: Record<BadgeVariant, string> = {
  safe: "bg-safe/15 text-safe-light border-safe/30",
  danger: "bg-danger/15 text-danger-light border-danger/30",
  warning: "bg-warning/15 text-warning-light border-warning/30",
  info: "bg-brand/15 text-brand-light border-brand/30",
  neutral: "bg-no-response/15 text-text-secondary border-border",
};

const dotColors: Record<BadgeVariant, string> = {
  safe: "bg-safe",
  danger: "bg-danger",
  warning: "bg-warning",
  info: "bg-brand",
  neutral: "bg-no-response",
};

export default function Badge({
  children,
  variant = "info",
  pulse = false,
  className = "",
  dot = false,
}: BadgeProps) {
  return (
    <span
      className={`
        inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold
        rounded-full border transition-all duration-200
        ${variantStyles[variant]}
        ${className}
      `}
    >
      {dot && (
        <span className="relative flex h-2 w-2">
          {pulse && (
            <span
              className={`
                absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping
                ${dotColors[variant]}
              `}
            />
          )}
          <span
            className={`
              relative inline-flex rounded-full h-2 w-2
              ${dotColors[variant]}
            `}
          />
        </span>
      )}
      {children}
    </span>
  );
}
