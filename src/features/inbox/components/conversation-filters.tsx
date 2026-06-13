"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  BUILTIN_FILTERS,
  type ConversationFilterId,
} from "../hooks/use-conversation-labels";
import { cn } from "@/lib/utils";
import { Plus, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";

interface ConversationFiltersProps {
  activeFilter: ConversationFilterId;
  onFilterChange: (filter: ConversationFilterId) => void;
  customLabels: string[];
  onAddCustomLabel: (name: string) => boolean;
}

export function ConversationFilters({
  activeFilter,
  onFilterChange,
  customLabels,
  onAddCustomLabel,
}: ConversationFiltersProps) {
  const [newLabel, setNewLabel] = useState("");
  const [showNewLabel, setShowNewLabel] = useState(false);

  function handleAddLabel() {
    const ok = onAddCustomLabel(newLabel);
    if (!ok) {
      toast.error("Etiqueta vacía o duplicada");
      return;
    }
    onFilterChange(newLabel.trim());
    setNewLabel("");
    setShowNewLabel(false);
    toast.success("Etiqueta creada");
  }

  const chips = [
    ...BUILTIN_FILTERS,
    ...customLabels.map((label) => ({ id: label, label })),
  ];

  return (
    <div className="space-y-2.5 px-4 pb-3">
      <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        <SlidersHorizontal className="h-3.5 w-3.5" />
        Filtrar
      </div>
      <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
        {chips.map((chip) => (
          <button
            key={chip.id}
            type="button"
            onClick={() => onFilterChange(chip.id)}
            className={cn(
              "shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition-all",
              activeFilter === chip.id
                ? "bg-blue-600 text-white shadow-sm shadow-blue-600/25"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200/80"
            )}
          >
            {chip.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setShowNewLabel((v) => !v)}
          className="shrink-0 inline-flex items-center gap-1 rounded-lg border border-dashed border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-500 hover:border-blue-300 hover:bg-blue-50/50 hover:text-blue-700"
        >
          <Plus className="h-3 w-3" />
          Etiqueta
        </button>
      </div>
      {showNewLabel ? (
        <div className="flex gap-2 rounded-lg border bg-slate-50/80 p-2">
          <Input
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            placeholder="Nombre de etiqueta"
            className="h-8 border-0 bg-white text-sm shadow-none focus-visible:ring-1"
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAddLabel();
            }}
          />
          <Button type="button" size="sm" className="h-8 shrink-0" onClick={handleAddLabel}>
            Crear
          </Button>
        </div>
      ) : null}
    </div>
  );
}
