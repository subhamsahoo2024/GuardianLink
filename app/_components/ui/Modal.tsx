"use client";

import React, { useEffect, useState } from "react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  variant?: "default" | "danger";
}

const sizeStyles: Record<string, string> = {
  sm: "max-w-sm",
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
};

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = "md",
  variant = "default",
}: ModalProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setVisible(true);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
      const timer = setTimeout(() => setVisible(false), 200);
      return () => clearTimeout(timer);
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!visible) return null;

  return (
    <div
      className={`
        fixed inset-0 z-50 flex items-center justify-center p-4
        transition-opacity duration-200
        ${isOpen ? "opacity-100" : "opacity-0"}
      `}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={title || "Modal dialog"}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal Content */}
      <div
        className={`
          relative w-full ${sizeStyles[size]}
          glass-elevated rounded-2xl shadow-2xl
          transition-all duration-200
          ${isOpen ? "scale-100 translate-y-0" : "scale-95 translate-y-4"}
          ${variant === "danger" ? "border-danger/30" : ""}
        `}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        {title && (
          <div
            className={`
              flex items-center justify-between px-6 py-4
              border-b ${variant === "danger" ? "border-danger/20" : "border-border"}
            `}
          >
            <h2 className="text-lg font-bold text-text-primary">{title}</h2>
            <button
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-surface text-text-muted hover:text-text-primary transition-colors cursor-pointer"
              aria-label="Close modal"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        )}

        {/* Body */}
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}
