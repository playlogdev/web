import { Skeleton } from "@/components/ui/skeleton";

export default function ActivityLoading() {
  return (
    <div className="flex flex-col gap-6" aria-label="Loading activity">
      <Skeleton className="w-40" />
      <Skeleton className="h-32" />
      {Array.from({ length: 3 }, (_, index) => <Skeleton key={index} className="h-40" />)}
    </div>
  );
}
