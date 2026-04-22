import LoadingSkeleton from "@/app/_components/ui/LoadingSkeleton";
import Card from "@/app/_components/ui/Card";

interface RouteLoadingPanelProps {
  title: string;
  detail?: string;
}

export default function RouteLoadingPanel({ title, detail }: RouteLoadingPanelProps) {
  return (
    <main className="px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <Card variant="elevated" className="space-y-4">
          <div className="space-y-2">
            <div className="h-5 w-44 rounded-full animate-shimmer" />
            <div className="h-8 w-80 max-w-full rounded-xl animate-shimmer" />
            <p className="max-w-2xl text-sm text-text-secondary">{detail || title}</p>
          </div>
          <LoadingSkeleton variant="card" />
        </Card>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <LoadingSkeleton variant="card" />
          <LoadingSkeleton variant="card" />
          <LoadingSkeleton variant="card" />
          <LoadingSkeleton variant="card" />
        </div>
      </div>
    </main>
  );
}
