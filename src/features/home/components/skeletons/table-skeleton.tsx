import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function TableSkeleton() {
  return (
    <div className="rounded-lg border bg-white shadow-sm overflow-hidden">
      <div className="p-6 border-b bg-white">
        <h3 className="text-lg font-semibold leading-none tracking-tight">
          <Skeleton className="h-6 w-32" />
        </h3>
        <div className="mt-1">
          <Skeleton className="h-4 w-48" />
        </div>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader className="bg-gray-100">
            <TableRow>
              <TableHead className="w-[150px] py-4 px-6">
                <Skeleton className="h-3 w-16" />
              </TableHead>
              <TableHead className="py-4 px-6">
                <Skeleton className="h-3 w-20" />
              </TableHead>
              <TableHead className="py-4 px-6">
                <Skeleton className="h-3 w-24" />
              </TableHead>
              <TableHead className="py-4 px-6">
                <Skeleton className="h-3 w-20" />
              </TableHead>
              <TableHead className="py-4 px-6">
                <Skeleton className="h-3 w-16" />
              </TableHead>
              <TableHead className="text-center py-4 px-6">
                <Skeleton className="h-3 w-20 mx-auto" />
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 5 }).map((_, index) => (
              <TableRow
                key={index}
                className="even:bg-gray-100 transition-colors"
              >
                <TableCell className="py-4 px-6">
                  <Skeleton className="h-4 w-24" />
                </TableCell>
                <TableCell className="py-4 px-6">
                  <Skeleton className="h-4 w-32" />
                </TableCell>
                <TableCell className="py-4 px-6">
                  <Skeleton className="h-4 w-28" />
                </TableCell>
                <TableCell className="py-4 px-6">
                  <Skeleton className="h-4 w-28" />
                </TableCell>
                <TableCell className="py-4 px-6">
                  <Skeleton className="h-6 w-20 rounded-full" />
                </TableCell>
                <TableCell className="py-4 px-6">
                  <div className="flex items-center justify-center gap-1">
                    <Skeleton className="h-8 w-8 rounded-md" />
                    <Skeleton className="h-8 w-8 rounded-md" />
                    <Skeleton className="h-8 w-8 rounded-md" />
                    <Skeleton className="h-8 w-8 rounded-md" />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Skeleton de paginación */}
      <div className="p-4 border-t">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-48" />
          <div className="flex gap-2">
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-9 w-24" />
          </div>
        </div>
      </div>
    </div>
  );
}
