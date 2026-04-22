"use client";

import React from "react";

type ButtonVariant = "primary" | "danger" | "ghost" | "safe" | "warning";
type ButtonSize = "sm" | "md" | "lg" | "xl";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: React.ReactNode;
  pulse?: boolean;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-brand hover:bg-brand-dark text-white shadow-lg hover:shadow-[var(--glow-brand)]",
  danger:
    "bg-danger hover:bg-critical text-white shadow-lg hover:shadow-[var(--glow-danger)]",
  ghost:
    "bg-transparent hover:bg-surface-elevated text-text-secondary hover:text-text-primary border border-border hover:border-border-light",
  safe: "bg-safe hover:bg-emerald-600 text-white shadow-lg hover:shadow-[var(--glow-safe)]",
  warning:
    "bg-warning hover:bg-amber-600 text-black shadow-lg hover:shadow-[var(--glow-warning)]",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-xs rounded-lg",
  md: "px-4 py-2 text-sm rounded-xl",
  lg: "px-6 py-3 text-base rounded-xl",
  xl: "px-8 py-4 text-lg rounded-2xl",
};

export default function Button({
  variant = "primary",
  size = "md",
  loading = false,
  icon,
  pulse = false,
  className = "",
  children,
  disabled,
  type,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type ?? "button"}
      aria-busy={loading || undefined}
      aria-disabled={disabled || loading || undefined}
      className={`
        inline-flex items-center justify-center gap-2 font-semibold
        transition-all duration-200 ease-out cursor-pointer
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-light/80 focus-visible:ring-offset-2 focus-visible:ring-offset-background
        disabled:opacity-50 disabled:cursor-not-allowed
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${pulse ? "animate-pulse-danger" : ""}
        ${className}
      `}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <svg
          className="animate-spin h-4 w-4"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
      ) : (
        icon
      )}
      {children}
    </button>
  );
}
