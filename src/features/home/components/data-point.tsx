import { cn } from "@/lib/utils";

interface DataPointProps {
  label: string;
  value: string | React.ReactNode;
  highlight?: boolean;
  className?: string;
  noBorder?: boolean;
}

export function DataPoint({
  label,
  value,
  highlight = false,
  className,
  noBorder = false,
}: DataPointProps) {
  return (
    <div
      className={cn(
        "mb-4 pb-2.5 last:pb-0",
        !noBorder && "border-b border-dotted border-gray-200",
        className
      )}
    >
      <span className="block text-xs text-gray-500 mb-1 uppercase tracking-wide">
        {label}
      </span>
      <div
        className={cn(
          "text-base font-medium",
          highlight ? "text-blue-600 font-semibold" : "text-gray-800"
        )}
      >
        {value}
      </div>
    </div>
  );
}
