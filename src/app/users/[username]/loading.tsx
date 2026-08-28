import { Skeleton } from "@/components/ui/skeleton";

export default function ProfileLoading() {
  return (
    <div className="flex flex-col gap-6" aria-label="Loading profile">
      <div className="flex flex-col gap-3">
        <Skeleton className="w-48" />
        <Skeleton className="w-64" />
      </div>
      <div className="grid grid-cols-3 gap-3">
        {Array.from({ length: 3 }, (_, index) => <Skeleton key={index} className="h-20" />)}
      </div>
      <Skeleton className="h-48" />
    </div>
  );
}
