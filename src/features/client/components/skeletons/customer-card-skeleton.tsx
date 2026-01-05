import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function CustomerCardSkeleton() {
  return (
    <Card className="overflow-hidden border-gray-100 bg-white">
      <CardHeader className="pb-4">
        <div className="flex items-center space-x-4">
          <Skeleton className="h-14 w-14 rounded-full" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-xl bg-gray-50/50 p-3 space-y-3">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-full" />
        </div>
        <div className="rounded-xl border border-gray-100 p-2.5 space-y-2">
          <Skeleton className="h-2 w-1/3" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-2 w-1/4" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 flex-1 rounded-lg" />
          <Skeleton className="h-9 w-9 rounded-lg" />
        </div>
      </CardContent>
    </Card>
  );
}
