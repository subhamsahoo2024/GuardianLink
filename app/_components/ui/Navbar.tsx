import Link from "next/link";
import { MonitorDot, QrCode, Shield, TabletSmartphone } from "lucide-react";

type NavbarSection = "home" | "guest" | "staff" | "responder";

interface NavbarProps {
  active?: NavbarSection;
  compact?: boolean;
  roomLabel?: string;
  className?: string;
}

const navigationItems = [
  { href: "/", label: "Home", section: "home" as const, icon: Shield },
  { href: "/room/402", label: "Guest", section: "guest" as const, icon: QrCode },
  { href: "/staff", label: "Staff", section: "staff" as const, icon: MonitorDot },
  {
    href: "/responder",
    label: "Responder",
    section: "responder" as const,
    icon: TabletSmartphone,
  },
];

export default function Navbar({
  active = "home",
  compact = false,
  roomLabel,
  className = "",
}: NavbarProps) {
  return (
    <header className={`glass sticky top-0 z-40 border-b border-border ${className}`}>
      <div
        className={`mx-auto flex w-full max-w-7xl items-center gap-3 px-4 sm:px-6 lg:px-8 ${
          compact ? "py-3" : "py-4"
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-brand/10 p-2 text-brand-light">
            <Shield size={20} />
          </div>
          <div>
            <div className="text-sm font-bold text-text-primary">GuardianLink</div>
            <div className="text-xs text-text-muted">
              {roomLabel || "Crisis coordination system"}
            </div>
          </div>
        </div>

        <nav className="ml-auto hidden items-center gap-2 md:flex">
          {navigationItems.map((item) => {
            const isActive = item.section === active;
            const Icon = item.icon;

            return (
              <Link
                key={item.section}
                href={item.href}
                className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition-colors ${
                  isActive
                    ? "border-brand/30 bg-brand/10 text-brand-light"
                    : "border-border text-text-secondary hover:border-brand/20 hover:bg-surface-elevated hover:text-text-primary"
                }`}
              >
                <Icon size={14} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2 md:hidden">
          <span className="rounded-full border border-safe/30 bg-safe/10 px-3 py-1 text-xs font-semibold text-safe-light">
            {active.toUpperCase()}
          </span>
        </div>
      </div>
    </header>
  );
}