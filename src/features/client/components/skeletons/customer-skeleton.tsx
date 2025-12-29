import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

export function CustomerTableSkeleton() {
  return (
    <div className="border bg-white overflow-hidden">
      <Table className="w-full">
        <TableHeader className="bg-gray-100">
          <TableRow>
            <TableHead className="py-4 px-6">
              <Skeleton className="h-3 w-32" />
            </TableHead>
            <TableHead className="py-4 px-6">
              <Skeleton className="h-3 w-20" />
            </TableHead>
            <TableHead className="py-4 px-6">
              <Skeleton className="h-3 w-40" />
            </TableHead>
            <TableHead className="text-center py-4 px-6">
              <Skeleton className="h-3 w-16 mx-auto" />
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
                <Skeleton className="h-4 w-48" />
              </TableCell>
              <TableCell className="py-4 px-6">
                <Skeleton className="h-4 w-28" />
              </TableCell>
              <TableCell className="py-4 px-6">
                <Skeleton className="h-4 w-56" />
              </TableCell>
              <TableCell className="py-4 px-6">
                <div className="flex justify-center gap-1">
                  <Skeleton className="h-8 w-8 rounded-md" />
                  <Skeleton className="h-8 w-8 rounded-md" />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
