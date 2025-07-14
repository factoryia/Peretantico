import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface FilterSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  options: { id: string; name: string }[];
  className?: string;
  disabled?: boolean;
}

export function FilterSelect({
  value,
  onValueChange,
  options,
  placeholder,
  className,
  disabled,
}: FilterSelectProps) {
  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger className={`w-48 data-[size=default]:h-11 ${className}`}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map(({ id, name }, i) => (
          <SelectItem key={i} value={id}>
            {name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
