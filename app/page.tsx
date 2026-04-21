"use client";

import React from "react";
import Link from "next/link";
import {
  ArrowRight,
  Shield,
  Radio,
  Map,
  Languages,
  Activity,
  Zap,
  Users,
  Siren,
  MonitorDot,
  Tablet,
  QrCode,
} from "lucide-react";
import AlertBanner from "./_components/ui/AlertBanner";
import Badge from "./_components/ui/Badge";
import Card from "./_components/ui/Card";

/* ============================================
   Hero Section
   ============================================ */
function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      <div className="absolute inset-x-0 top-0 z-20">
        <AlertBanner
          variant="danger"
          messages={[
            "Demo route slice is live",
            "Guest, staff, and responder shells now open from the landing page",
            "External API keys remain placeholders in .env.example",
          ]}
        />
      </div>

      {/* Animated background grid */}
      <div className="absolute inset-0 grid-bg" />

      {/* Gradient orbs */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-brand/10 rounded-full blur-[120px] animate-float" />
      <div
        className="absolute bottom-1/4 -right-32 w-96 h-96 bg-danger/8 rounded-full blur-[120px] animate-float"
        style={{ animationDelay: "1.5s" }}
      />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-safe/5 rounded-full blur-[150px]" />

      <div className="relative z-10 max-w-6xl mx-auto px-6 text-center">
        {/* Status badge */}
        <div className="animate-fade-in mb-8 inline-flex items-center gap-2 px-4 py-2 rounded-full glass text-sm text-text-secondary">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full rounded-full bg-safe opacity-75 animate-ping" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-safe" />
          </span>
          System Operational — foundation slice running
        </div>

        {/* Main heading */}
        <h1
          className="animate-fade-in text-5xl sm:text-6xl lg:text-7xl font-extrabold leading-tight tracking-tight mb-6"
          style={{ animationDelay: "0.1s" }}
        >
          <span className="text-text-primary">Crisis Response,</span>
          <br />
          <span className="bg-gradient-to-r from-brand via-brand-light to-cyan-400 bg-clip-text text-transparent">
            Reimagined.
          </span>
        </h1>

        {/* Subtitle */}
        <p
          className="animate-fade-in max-w-2xl mx-auto text-lg sm:text-xl text-text-secondary mb-10 leading-relaxed"
          style={{ animationDelay: "0.2s" }}
        >
          GuardianLink bridges the gap between distressed guests, hotel
          security, and first responders — all with{" "}
          <span className="text-brand-light font-semibold">
            zero app downloads
          </span>{" "}
          and{" "}
          <span className="text-safe-light font-semibold">
            AI-powered intelligence
          </span>
          .
        </p>

        {/* CTA Buttons */}
        <div
          className="animate-fade-in flex flex-col sm:flex-row items-center justify-center gap-4 mb-16"
          style={{ animationDelay: "0.3s" }}
        >
          <Link
            href="/room/402"
            id="guest-demo-btn"
            className="inline-flex items-center gap-2 px-8 py-4 bg-brand hover:bg-brand-dark text-white font-semibold rounded-2xl shadow-lg hover:shadow-[var(--glow-brand)] transition-all duration-300 hover:-translate-y-0.5"
          >
            <QrCode size={20} />
            Guest Demo (Room 402)
            <ArrowRight size={16} />
          </Link>
          <Link
            href="/staff"
            id="staff-login-btn"
            className="inline-flex items-center gap-2 px-8 py-4 glass hover:bg-surface-elevated text-text-primary font-semibold rounded-2xl transition-all duration-300 hover:-translate-y-0.5"
          >
            <MonitorDot size={20} />
            Staff Command Center
          </Link>
          <Link
            href="/responder"
            id="responder-login-btn"
            className="inline-flex items-center gap-2 px-8 py-4 glass hover:bg-surface-elevated text-text-primary font-semibold rounded-2xl transition-all duration-300 hover:-translate-y-0.5"
          >
            <Tablet size={20} />
            Responder Bridge
          </Link>
        </div>

        {/* Stats bar */}
        <div
          className="animate-fade-in grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-3xl mx-auto"
          style={{ animationDelay: "0.4s" }}
        >
          {[
            { value: "<2s", label: "Alert Latency", icon: Zap },
            { value: "40+", label: "Languages", icon: Languages },
            { value: "0", label: "App Downloads", icon: QrCode },
            { value: "24/7", label: "AI Monitoring", icon: Activity },
          ].map((stat) => (
            <div
              key={stat.label}
              className="glass rounded-xl p-4 text-center hover:border-brand/20 transition-all duration-300"
            >
              <stat.icon size={18} className="mx-auto mb-2 text-brand-light" />
              <div className="text-2xl font-bold text-text-primary">
                {stat.value}
              </div>
              <div className="text-xs text-text-muted">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ============================================
   Feature Card
   ============================================ */
interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  tag: string;
  tagColor: string;
  delay: string;
}

function FeatureCard({
  icon,
  title,
  description,
  tag,
  tagColor,
  delay,
}: FeatureCardProps) {
  return (
    <div
      className="group glass rounded-2xl p-6 hover:border-brand/20 hover:-translate-y-1 transition-all duration-500 animate-fade-in"
      style={{ animationDelay: delay }}
    >
      <div className="flex items-start gap-4 mb-4">
        <div className="p-3 rounded-xl bg-brand/10 text-brand-light group-hover:bg-brand/20 transition-colors">
          {icon}
        </div>
        <span
          className={`text-xs font-bold px-2.5 py-1 rounded-full ${tagColor}`}
        >
          {tag}
        </span>
      </div>
      <h3 className="text-xl font-bold text-text-primary mb-2 group-hover:text-brand-light transition-colors">
        {title}
      </h3>
      <p className="text-text-secondary text-sm leading-relaxed">
        {description}
      </p>
    </div>
  );
}

function RoutePreviewCard({
  icon,
  title,
  description,
  route,
  accentClass,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  route: string;
  accentClass: string;
}) {
  return (
    <Card variant="glass" hover className="h-full">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className={`p-3 rounded-xl ${accentClass}`}>{icon}</div>
        <Badge variant="neutral">{route}</Badge>
      </div>
      <h3 className="text-xl font-bold text-text-primary mb-2">{title}</h3>
      <p className="text-text-secondary text-sm leading-relaxed mb-6">
        {description}
      </p>
      <Link
        href={route}
        className="inline-flex items-center justify-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-semibold text-text-primary transition-colors hover:border-brand/30 hover:bg-surface-elevated"
      >
        Open route
        <ArrowRight size={14} />
      </Link>
    </Card>
  );
}

/* ============================================
   Features Section
   ============================================ */
function FeaturesSection() {
  const features = [
    {
      icon: <Map size={24} />,
      title: "Dynamic Safe-Path Navigation",
      description:
        "Real-time evacuation routes drawn on your phone. If a hallway is blocked, the AI reroutes instantly to a safer exit.",
      tag: "PATHFINDING",
      tagColor: "bg-safe/15 text-safe-light",
    },
    {
      icon: <Activity size={24} />,
      title: "Gemini AI Chaos Filter",
      description:
        "Gemini 3 Flash analyzes hundreds of reports — text, audio, and video — merging duplicates into actionable intelligence.",
      tag: "AI POWERED",
      tagColor: "bg-brand/15 text-brand-light",
    },
    {
      icon: <Languages size={24} />,
      title: "Real-time Multilingual SOS",
      description:
        "Speak in your native language. Our AI translates your distress call instantly for local staff and first responders.",
      tag: "40+ LANGUAGES",
      tagColor: "bg-warning/15 text-warning-light",
    },
    {
      icon: <Radio size={24} />,
      title: "Digital Triage Heatmap",
      description:
        "Live visualization of every guest's status. Green for safe, red for trapped, grey for no response — updated in real-time.",
      tag: "REAL-TIME",
      tagColor: "bg-danger/15 text-danger-light",
    },
  ];

  return (
    <section className="relative py-24 px-6">
      <div className="absolute inset-0 dot-bg opacity-40" />
      <div className="relative z-10 max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-text-primary mb-4">
            Built for the Worst Moments
          </h2>
          <p className="text-text-secondary max-w-xl mx-auto">
            Every feature is designed to save time when seconds matter most.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {features.map((feature, i) => (
            <FeatureCard
              key={feature.title}
              {...feature}
              delay={`${i * 0.1}s`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

/* ============================================
   Three-Tier System Section
   ============================================ */
function TierSection() {
  const tiers = [
    {
      icon: <QrCode size={32} />,
      title: "Guest Survival Hub",
      subtitle: "Zero-Install PWA",
      description:
        "Scan a QR code. Get life-saving navigation, SOS reporting, and real-time alerts — in your language.",
      link: "/room/402",
      gradient: "from-brand/20 to-transparent",
      accentClass: "bg-brand/10 text-brand-light",
      subtitleClass: "bg-brand/15 text-brand-light",
    },
    {
      icon: <MonitorDot size={32} />,
      title: "Staff Command Center",
      subtitle: "Desktop Dashboard",
      description:
        "AI-synthesized incident feeds, live heatmaps, danger zone management, and one-click broadcasts.",
      link: "/staff",
      gradient: "from-safe/20 to-transparent",
      accentClass: "bg-safe/10 text-safe-light",
      subtitleClass: "bg-safe/15 text-safe-light",
    },
    {
      icon: <Siren size={32} />,
      title: "First Responder Bridge",
      subtitle: "Tactical Tablet",
      description:
        "Technical floor plans, triage scorecards, room-by-room status, and AI-powered voice translation.",
      link: "/responder",
      gradient: "from-warning/20 to-transparent",
      accentClass: "bg-warning/10 text-warning-light",
      subtitleClass: "bg-warning/15 text-warning-light",
    },
  ];

  return (
    <section className="py-24 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass text-sm text-text-secondary mb-6">
            <Shield size={16} className="text-brand-light" />
            Three-Tier Mesh System
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-text-primary mb-4">
            One Platform, Three Perspectives
          </h2>
          <p className="text-text-secondary max-w-xl mx-auto">
            Each stakeholder gets exactly the interface they need in a crisis.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {tiers.map((tier, i) => (
            <Link
              key={tier.title}
              href={tier.link}
              className="group glass rounded-2xl p-8 hover:-translate-y-1 transition-all duration-500 animate-fade-in relative overflow-hidden"
              style={{ animationDelay: `${i * 0.15}s` }}
            >
              {/* Gradient accent */}
              <div
                className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${tier.gradient}`}
              />

              <div
                className={`p-4 rounded-2xl ${tier.accentClass} w-fit mb-6 group-hover:opacity-90 transition-colors`}
              >
                {tier.icon}
              </div>

              <h3 className="text-xl font-bold text-text-primary mb-1">
                {tier.title}
              </h3>
              <p
                className={`text-sm font-semibold ${tier.subtitleClass} mb-3 inline-flex px-2.5 py-1 rounded-full`}
              >
                {tier.subtitle}
              </p>
              <p className="text-text-secondary text-sm leading-relaxed mb-6">
                {tier.description}
              </p>

              <div className="flex items-center gap-2 text-sm font-semibold text-text-muted group-hover:text-brand-light transition-colors">
                Launch Dashboard
                <ArrowRight
                  size={14}
                  className="group-hover:translate-x-1 transition-transform"
                />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ============================================
   Tech Stack Section
   ============================================ */
function TechStackSection() {
  const techs = [
    { name: "Next.js 16", detail: "App Router + RSC" },
    { name: "Gemini AI", detail: "Multimodal Triage" },
    { name: "Firebase", detail: "Real-time Engine" },
    { name: "Google Maps", detail: "Indoor Navigation" },
    { name: "Tailwind v4", detail: "Design System" },
    { name: "Web Push", detail: "Critical Alerts" },
  ];

  return (
    <section className="py-20 px-6 border-t border-border">
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="text-2xl font-bold text-text-primary mb-8">
          Powered by Modern Infrastructure
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {techs.map((tech) => (
            <div
              key={tech.name}
              className="glass rounded-xl p-4 hover:border-brand/20 transition-all duration-300"
            >
              <div className="text-sm font-bold text-text-primary">
                {tech.name}
              </div>
              <div className="text-xs text-text-muted mt-1">{tech.detail}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function LaunchPadsSection() {
  const routes = [
    {
      icon: <QrCode size={24} />,
      title: "Guest entry shell",
      description:
        "A room-aware crisis experience for guest access, status, and future SOS flows.",
      route: "/room/402",
      accentClass: "bg-brand/10 text-brand-light",
    },
    {
      icon: <MonitorDot size={24} />,
      title: "Staff command shell",
      description:
        "A tactical desktop dashboard scaffold for incident synthesis, heatmaps, and broadcasts.",
      route: "/staff",
      accentClass: "bg-safe/10 text-safe-light",
    },
    {
      icon: <Tablet size={24} />,
      title: "Responder bridge shell",
      description:
        "A tablet-first responder view for floor plans, triage, and room-level coordination.",
      route: "/responder",
      accentClass: "bg-warning/10 text-warning-light",
    },
  ];

  return (
    <section className="py-24 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <Badge variant="info" dot pulse className="mb-4">
            Implemented launch pads
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-text-primary mb-4">
            Routes that already work
          </h2>
          <p className="text-text-secondary max-w-2xl mx-auto">
            This slice wires the public landing page to real route targets so
            the project can grow from a functioning navigation shell instead of
            a static mock.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {routes.map((route) => (
            <RoutePreviewCard key={route.route} {...route} />
          ))}
        </div>
      </div>
    </section>
  );
}

/* ============================================
   Footer
   ============================================ */
function Footer() {
  return (
    <footer className="py-10 px-6 border-t border-border text-center">
      <div className="flex items-center justify-center gap-2 mb-3">
        <Shield size={20} className="text-brand-light" />
        <span className="text-lg font-bold text-text-primary">
          GuardianLink
        </span>
      </div>
      <p className="text-sm text-text-muted max-w-md mx-auto">
        Saving time when every second counts. A crisis coordination ecosystem
        built for the hospitality industry.
      </p>
      <div className="mt-4 flex items-center justify-center gap-1 text-xs text-text-muted">
        <Users size={12} />
        SDG 3 · SDG 11
      </div>
    </footer>
  );
}

/* ============================================
   Main Page
   ============================================ */
export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen">
      <HeroSection />
      <FeaturesSection />
      <TierSection />
      <LaunchPadsSection />
      <TechStackSection />
      <Footer />
    </div>
  );
}
