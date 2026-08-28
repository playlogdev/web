import { Skeleton } from "@/components/ui/skeleton";

export default function DiscoverLoading() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-live="polite">
      <p className="sr-only">Loading game search…</p>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-72 max-w-full" />
      </div>
      <Skeleton className="h-12 w-full" />
      <div className="flex flex-col gap-3">
        {[0, 1, 2].map((item) => (
          <div key={item} className="flex gap-4 rounded-xl border border-edge bg-surface p-4">
            <Skeleton className="h-31.25 w-22 shrink-0 rounded-lg" />
            <div className="flex flex-1 flex-col gap-3 py-2">
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="h-3 w-1/3" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
