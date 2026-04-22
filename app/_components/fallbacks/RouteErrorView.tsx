"use client";

import Link from "next/link";
import { AlertTriangle, ArrowLeft, RefreshCw } from "lucide-react";
import Card from "@/app/_components/ui/Card";
import Button from "@/app/_components/ui/Button";

interface RouteErrorViewProps {
  title: string;
  description: string;
  reset: () => void;
}

export default function RouteErrorView({
  title,
  description,
  reset,
}: RouteErrorViewProps) {
  return (
    <main className="flex min-h-[70vh] items-center justify-center px-4 py-8 sm:px-6 lg:px-8">
      <Card variant="elevated" className="w-full max-w-2xl space-y-5">
        <div className="flex items-start gap-4">
          <div className="rounded-2xl bg-danger/10 p-3 text-danger-light">
            <AlertTriangle size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-text-primary">{title}</h1>
            <p className="mt-2 text-sm text-text-secondary">{description}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button
            variant="warning"
            icon={<RefreshCw size={16} />}
            onClick={reset}
          >
            Try again
          </Button>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-semibold text-text-primary transition-colors hover:border-brand/30 hover:bg-surface-elevated"
          >
            <ArrowLeft size={16} />
            Go home
          </Link>
        </div>
      </Card>
    </main>
  );
}
