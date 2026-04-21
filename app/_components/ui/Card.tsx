import React from "react";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "glass" | "elevated" | "danger" | "safe";
  hover?: boolean;
  padding?: "none" | "sm" | "md" | "lg";
}

const variantStyles: Record<string, string> = {
  default: "bg-surface border border-border",
  glass: "glass",
  elevated: "glass-elevated",
  danger: "bg-surface border border-danger/30 shadow-[var(--glow-danger)]",
  safe: "bg-surface border border-safe/30 shadow-[var(--glow-safe)]",
};

const paddingStyles: Record<string, string> = {
  none: "p-0",
  sm: "p-3",
  md: "p-5",
  lg: "p-7",
};

export default function Card({
  children,
  className = "",
  variant = "default",
  hover = false,
  padding = "md",
}: CardProps) {
  return (
    <div
      className={`
        rounded-2xl transition-all duration-300
        ${variantStyles[variant]}
        ${paddingStyles[padding]}
        ${hover ? "hover:border-brand/30 hover:shadow-[var(--glow-brand)] hover:-translate-y-0.5" : ""}
        ${className}
      `}
    >
      {children}
    </div>
  );
}
