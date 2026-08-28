import { Skeleton } from "@/components/ui/skeleton";

export default function SteamConnectionLoading() {
  return (
    <div className="flex flex-col gap-6" aria-label="Loading Steam library">
      <Skeleton className="w-48" />
      <Skeleton className="h-40" />
      <Skeleton className="h-44" />
      {Array.from({ length: 3 }, (_, index) => <Skeleton key={index} className="h-48" />)}
    </div>
  );
}
