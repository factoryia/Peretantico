"use client";

import { useEffect, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Bot,
  Check,
  MoreVertical,
  PauseCircle,
  PlayCircle,
  UserRound,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { labelChipClass, PIPELINE_STAGE_META } from "../utils/labels";
import { contactInitials } from "../utils/format";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type CatalogLabel = { _id: string; name: string; color?: string | null };

export function ChatHeader({
  contactId,
  title,
  phone,
  whatsappName,
  resolvedName,
  labels,
  catalogLabels,
  pipelineStage,
  botMuted,
  botMutedUntil,
  onToggleBot,
}: {
  contactId: string;
  title: string;
  phone: string;
  whatsappName?: string | null;
  resolvedName?: string | null;
  labels: string[];
  catalogLabels: CatalogLabel[];
  pipelineStage?: "visitante" | "en_proceso" | "solicitud";
  botMuted: boolean;
  botMutedUntil: string | null;
  onToggleBot: () => void;
}) {
  const updateContactInbox = useMutation(api.conversationState.updateContactInbox);
  const [menuOpen, setMenuOpen] = useState(false);
  const [nameDraft, setNameDraft] = useState(resolvedName ?? "");
  const [localLabels, setLocalLabels] = useState(labels);
  const [saving, setSaving] = useState(false);

  const stage = pipelineStage ? PIPELINE_STAGE_META[pipelineStage] : null;

  useEffect(() => {
    if (!menuOpen) setNameDraft(resolvedName ?? "");
  }, [resolvedName, menuOpen]);

  useEffect(() => {
    setLocalLabels(labels);
  }, [labels, contactId]);

  async function saveDisplayName() {
    const trimmed = nameDraft.trim();
    setSaving(true);
    try {
      await updateContactInbox({ contactId, displayName: trimmed });
      toast.success(trimmed ? "Contacto guardado" : "Nombre eliminado");
      setMenuOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo guardar");
    } finally {
      setSaving(false);
    }
  }

  async function updateLabels(next: string[]) {
    const previous = localLabels;
    setLocalLabels(next);
    try {
      await updateContactInbox({ contactId, labels: next });
      toast.success(next.length ? "Etiquetas actualizadas" : "Etiquetas quitadas");
    } catch (err) {
      setLocalLabels(previous);
      toast.error(err instanceof Error ? err.message : "No se pudieron guardar las etiquetas");
    }
  }

  return (
    <header className="shrink-0 border-b border-[#e9edef] bg-white px-3 py-2.5 shadow-sm md:px-4">
      <div className="flex items-center gap-3">
        <Avatar className="h-10 w-10 shrink-0 ring-2 ring-primary/10 md:h-11 md:w-11">
          <AvatarFallback className="bg-primary text-sm font-semibold text-primary-foreground">
            {contactInitials(title)}
          </AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-semibold text-[#111b21] md:text-base">{title}</p>
          <div className="flex flex-wrap items-center gap-1.5">
            <p className="truncate text-xs text-[#667781]">{phone}</p>
            {stage ? (
              <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", stage.className)}>
                {stage.label}
              </span>
            ) : null}
            {localLabels.slice(0, 2).map((label) => (
              <span
                key={label}
                className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium", labelChipClass(label))}
              >
                {label}
              </span>
            ))}
            {localLabels.length > 2 ? (
              <span className="text-[10px] text-[#8696a0]">+{localLabels.length - 2}</span>
            ) : null}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <span
            className={cn(
              "hidden sm:inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium",
              botMuted
                ? "bg-amber-50 text-amber-800 ring-1 ring-amber-100"
                : "bg-primary/10 text-primary ring-1 ring-primary/10"
            )}
          >
            {botMuted ? <UserRound className="h-3 w-3" /> : <Bot className="h-3 w-3" />}
            {botMuted ? (botMutedUntil ? "Pausado" : "Humano") : "Bot"}
          </span>

          <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-[#54656f] hover:bg-[#f0f2f5]"
                aria-label="Opciones del contacto"
              >
                <MoreVertical className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-72">
              <DropdownMenuLabel className="text-xs font-semibold uppercase tracking-wide text-[#8696a0]">
                Guardar contacto
              </DropdownMenuLabel>
              <div className="px-2 pb-2">
                <div className="flex items-center gap-1.5">
                  <Input
                    value={nameDraft}
                    onChange={(e) => setNameDraft(e.target.value)}
                    placeholder="Nombre del cliente"
                    className="h-8 flex-1 text-sm"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") void saveDisplayName();
                    }}
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 shrink-0 text-emerald-600"
                    disabled={saving}
                    onClick={() => void saveDisplayName()}
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 shrink-0 text-[#8696a0]"
                    onClick={() => setNameDraft(resolvedName ?? "")}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                {whatsappName && whatsappName !== resolvedName ? (
                  <p className="mt-1.5 px-0.5 text-[11px] text-muted-foreground">
                    WhatsApp: {whatsappName}
                  </p>
                ) : null}
              </div>

              <DropdownMenuSeparator />

              <DropdownMenuLabel className="text-xs font-semibold uppercase tracking-wide text-[#8696a0]">
                Etiquetas
              </DropdownMenuLabel>
              {catalogLabels.length === 0 ? (
                <p className="px-2 pb-2 text-xs text-muted-foreground">
                  Crea etiquetas en el panel lateral
                </p>
              ) : (
                catalogLabels.map((item) => (
                  <DropdownMenuCheckboxItem
                    key={item._id}
                    checked={localLabels.includes(item.name)}
                    onSelect={(e) => e.preventDefault()}
                    onCheckedChange={(checked) => {
                      const next = checked
                        ? [...localLabels, item.name]
                        : localLabels.filter((l) => l !== item.name);
                      void updateLabels(next);
                    }}
                  >
                    {item.name}
                  </DropdownMenuCheckboxItem>
                ))
              )}

              <DropdownMenuSeparator />

              <DropdownMenuItem onClick={onToggleBot} className="gap-2 cursor-pointer">
                {botMuted ? (
                  <>
                    <PlayCircle className="h-4 w-4 text-primary" />
                    Reactivar bot
                  </>
                ) : (
                  <>
                    <PauseCircle className="h-4 w-4 text-amber-700" />
                    Pausar bot
                  </>
                )}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
