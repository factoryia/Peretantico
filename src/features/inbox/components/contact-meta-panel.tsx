"use client";

import { useEffect, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Check, Pencil, Tag, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { labelChipClass } from "../utils/labels";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type CatalogLabel = { _id: string; name: string; color?: string | null };

export function ContactMetaPanel({
  contactId,
  resolvedName,
  whatsappName,
  phone,
  labels,
  catalogLabels,
}: {
  contactId: string;
  resolvedName?: string | null;
  whatsappName?: string | null;
  phone: string;
  labels: string[];
  catalogLabels: CatalogLabel[];
}) {
  const updateContactInbox = useMutation(api.conversationState.updateContactInbox);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(resolvedName ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!editingName) setNameDraft(resolvedName ?? "");
  }, [resolvedName, editingName]);

  async function saveDisplayName() {
    const trimmed = nameDraft.trim();
    setSaving(true);
    try {
      await updateContactInbox({ contactId, displayName: trimmed });
      setEditingName(false);
      toast.success(trimmed ? "Nombre guardado" : "Nombre eliminado");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo guardar");
    } finally {
      setSaving(false);
    }
  }

  async function updateLabels(next: string[]) {
    try {
      await updateContactInbox({ contactId, labels: next });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudieron guardar las etiquetas");
    }
  }

  return (
    <div className="border-b border-[#e9edef] bg-white/90 px-4 py-3 backdrop-blur-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[#8696a0]">
            Cliente guardado
          </p>
          {editingName ? (
            <div className="flex items-center gap-2">
              <Input
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                placeholder="Nombre del cliente"
                className="h-9 max-w-xs border-[#e9edef] bg-[#f8f9fa] text-sm"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") void saveDisplayName();
                  if (e.key === "Escape") {
                    setNameDraft(resolvedName ?? "");
                    setEditingName(false);
                  }
                }}
              />
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-emerald-600"
                disabled={saving}
                onClick={() => void saveDisplayName()}
              >
                <Check className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-[#8696a0]"
                onClick={() => {
                  setNameDraft(resolvedName ?? "");
                  setEditingName(false);
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <p className="truncate text-sm font-semibold text-[#111b21]">
                {resolvedName?.trim() || "Sin nombre guardado"}
              </p>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 shrink-0 text-[#8696a0] hover:text-primary"
                onClick={() => setEditingName(true)}
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
          <p className="text-xs text-[#667781]">{phone}</p>
          {whatsappName && whatsappName !== resolvedName ? (
            <p className="text-[11px] text-[#8696a0]">WhatsApp: {whatsappName}</p>
          ) : null}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 gap-1.5 border-[#e9edef] bg-white text-xs">
              <Tag className="h-3.5 w-3.5" />
              Etiquetas
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            {catalogLabels.length === 0 ? (
              <p className="px-2 py-3 text-xs text-muted-foreground">Crea etiquetas en el panel lateral</p>
            ) : (
              catalogLabels.map((item) => (
                <DropdownMenuCheckboxItem
                  key={item._id}
                  checked={labels.includes(item.name)}
                  onCheckedChange={(checked) =>
                    void updateLabels(
                      checked ? [...labels, item.name] : labels.filter((l) => l !== item.name)
                    )
                  }
                >
                  {item.name}
                </DropdownMenuCheckboxItem>
              ))
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {labels.length > 0 ? (
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {labels.map((label) => (
            <Badge
              key={label}
              variant="outline"
              className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium", labelChipClass(label))}
            >
              {label}
            </Badge>
          ))}
        </div>
      ) : null}
    </div>
  );
}
