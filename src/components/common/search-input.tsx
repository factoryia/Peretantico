import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

interface SearchInputProps {
  value: string;
  onValueChange: (value: string) => void;

  placeholder?: string;
}

export function SearchInput({
  value,
  placeholder,
  onValueChange,
}: SearchInputProps) {
  return (
    <div className="relative space-y-2">
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        placeholder={placeholder}
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        className="pl-8 min-w-full sm:min-w-[300px]"
      />
    </div>
  );
}
