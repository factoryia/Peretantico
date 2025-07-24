import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface SearchInputProps {
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
  placeholder?: string;
}

export function SearchInput({
  value,
  placeholder,
  onValueChange,
  className,
}: SearchInputProps) {
  return (
    <div className={cn("relative space-y-2 md:min-w-[300px]", className)}>
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        placeholder={placeholder}
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        className="pl-8 min-w-full"
      />
    </div>
  );
}
