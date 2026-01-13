import {
  Card,
  CardContent,
  CardHeader,
  CardFooter,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function DistributorRequestCardSkeleton() {
  return (
    <Card className="overflow-hidden border-2 py-0 border-gray-100 shadow-none">
      <CardHeader className="bg-gray-50/50 pb-3 pt-6">
        <div className="flex justify-between items-start">
          <div className="space-y-2">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-4 w-24" />
          </div>
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>
      </CardHeader>

      <CardContent className="pt-4 space-y-4 flex-1">
        <div className="space-y-3">
          <div className="space-y-2">
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-4 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-3 w-36" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-3 w-3/4" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-3 w-40" />
            <Skeleton className="h-4 w-5/6" />
          </div>
          <div className="pt-2">
            <Skeleton className="h-24 w-full rounded-lg" />
          </div>
        </div>
      </CardContent>

      <CardFooter className="bg-gray-50/30 pt-4 pb-6 border-t flex flex-col gap-3">
        <Skeleton className="h-9 w-full rounded-lg" />
        <div className="w-full space-y-3">
          <Skeleton className="h-10 w-full rounded-xl" />
          <Skeleton className="h-10 w-full rounded-xl" />
        </div>
      </CardFooter>
    </Card>
  );
}

export function DistributorDashboardSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <DistributorRequestCardSkeleton key={i} />
      ))}
    </div>
  );
}
