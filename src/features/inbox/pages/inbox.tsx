"use client";

import { useEffect, useMemo, useState } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { SidebarHeader } from "@/components/navigation/sidebar-header";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle,
  ArrowLeft,
  MessageSquare,
  Search,
  Plus,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";
import { ChatComposer } from "../components/chat-composer";
import { ChatMessageList } from "../components/chat-message-list";
import { ChatHeader } from "../components/chat-header";
import {
  useReadConversations,
  BUILTIN_FILTERS,
  isPipelineFilter,
  isBuiltinFilter,
  type ConversationFilterId,
} from "../hooks/use-conversation-labels";
import {
  contactInitials,
  formatListTime,
  formatPhoneDisplay,
} from "../utils/format";
import { labelChipClass, PIPELINE_STAGE_META } from "../utils/labels";

/* ─── helpers ─────────────────────────────────────────────── */

function formatMessageTimeLong(ts: number) {
  return new Date(ts).toLocaleString("es-CO", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

type ContactRow = {
  contactId: string;
  customerName?: string | null;
  displayName?: string | null;
  resolvedName?: string | null;
  labels?: string[];
  pipelineStage?: "visitante" | "en_proceso" | "solicitud";
  lastMessageAt: number;
  lastMessage: string;
  lastDirection: "INBOUND" | "OUTBOUND";
  botMuted?: boolean;
  needsHuman?: boolean;
  escalationReason?: string | null;
};

function contactTitle(c: ContactRow) {
  return c.resolvedName?.trim() || c.displayName?.trim() || c.customerName?.trim() || formatPhoneDisplay(c.contactId);
}

function matchesClientFilter(contact: ContactRow, filter: ConversationFilterId): boolean {
  if (filter === "all") return true;
  if (filter === "needsHuman") return contact.needsHuman === true;
  if (filter === "bot") return !contact.botMuted;
  if (filter === "agent") return contact.botMuted === true;
  return true;
}

/* ─── ContactItem ─────────────────────────────────────────── */

function ContactItem({
  contact,
  isActive,
  onClick,
}: {
  contact: ContactRow;
  isActive: boolean;
  onClick: () => void;
}) {
  const title = contactTitle(contact);
  const isUnread = contact.lastDirection === "INBOUND";
  const stage = contact.pipelineStage ? PIPELINE_STAGE_META[contact.pipelineStage] : null;
  const labels = contact.labels ?? [];

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group w-full max-w-full flex items-start gap-3 px-4 py-3.5 transition-all text-left overflow-hidden border-b border-[#f0f2f5]/80",
        "hover:bg-[#f8f9fa]",
        isActive ? "bg-primary/6 border-l-[3px] border-l-primary pl-[13px]" : "bg-white border-l-[3px] border-l-transparent"
      )}
    >
      <Avatar className="h-12 w-12 shrink-0 ring-2 ring-white shadow-sm">
        <AvatarFallback
          className={cn(
            "text-sm font-semibold",
            isActive ? "bg-primary text-primary-foreground" : "bg-linear-to-br from-[#dfe5e7] to-[#c8d0d4] text-[#3b4a54]"
          )}
        >
          {contactInitials(title)}
        </AvatarFallback>
      </Avatar>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2 min-w-0">
          <span
            className={cn(
              "min-w-0 flex-1 truncate text-[15px]",
              isUnread && !isActive ? "font-bold text-[#111b21]" : "font-semibold text-[#111b21]"
            )}
          >
            {title}
          </span>
          <span
            className={cn(
              "shrink-0 text-[11px] tabular-nums",
              isUnread && !isActive ? "text-primary font-bold" : "text-[#667781]"
            )}
          >
            {formatListTime(contact.lastMessageAt)}
          </span>
        </div>

        <p className="mt-0.5 truncate text-[13px] text-[#667781]">{contact.lastMessage}</p>

        <div className="mt-1.5 flex flex-wrap items-center gap-1">
          {stage ? (
            <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", stage.className)}>
              {stage.label}
            </span>
          ) : null}
          {contact.needsHuman ? (
            <span className="inline-flex items-center gap-0.5 rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-700">
              <AlertTriangle className="h-2.5 w-2.5" />
              Atención
            </span>
          ) : contact.botMuted ? (
            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
              Agente
            </span>
          ) : (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
              Bot
            </span>
          )}
          {labels.slice(0, 2).map((label) => (
            <span
              key={label}
              className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium", labelChipClass(label))}
            >
              {label}
            </span>
          ))}
          {labels.length > 2 ? (
            <span className="text-[10px] text-[#8696a0]">+{labels.length - 2}</span>
          ) : null}
          {isUnread && !isActive ? (
            <span className="ml-auto flex h-2 w-2 rounded-full bg-primary" />
          ) : null}
        </div>
      </div>
    </button>
  );
}

/* ─── Sidebar ─────────────────────────────────────────────── */

function ConversationSidebar({
  contacts,
  selectedContactId,
  isLoading,
  search,
  onSearchChange,
  activeFilter,
  onFilterChange,
  catalogLabels,
  onAddLabel,
  onSelect,
  totalCount,
}: {
  contacts: ContactRow[];
  selectedContactId: string | null;
  isLoading: boolean;
  search: string;
  onSearchChange: (v: string) => void;
  activeFilter: ConversationFilterId;
  onFilterChange: (f: ConversationFilterId) => void;
  catalogLabels: Array<{ _id: string; name: string; color?: string | null }>;
  onAddLabel: (name: string) => Promise<boolean>;
  onSelect: (id: string) => void;
  totalCount: number;
}) {
  const [newLabel, setNewLabel] = useState("");
  const [showNewLabel, setShowNewLabel] = useState(false);

  const chips = [
    ...BUILTIN_FILTERS,
    ...catalogLabels
      .filter((l) => !isBuiltinFilter(l.name))
      .map((l) => ({ id: l.name, label: l.name })),
  ];

  return (
    <aside className="flex h-full w-full min-w-0 flex-col overflow-hidden border-r border-[#e9edef] bg-[#f8f9fa] md:w-[400px] md:shrink-0">
      <div className="shrink-0 border-b border-[#e9edef] bg-white px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-[#111b21]">Bandeja de entrada</p>
            <p className="text-[11px] text-[#667781]">
              {totalCount} conversación{totalCount === 1 ? "" : "es"} · historial guardado
            </p>
          </div>
          <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/10">
            WhatsApp
          </Badge>
        </div>
      </div>

      <div className="shrink-0 bg-white px-3 py-2.5">
        <div className="relative flex items-center rounded-xl border border-[#e9edef] bg-[#f0f2f5]/80 shadow-inner">
          <Search className="absolute left-3 h-4 w-4 text-[#54656f]" />
          <Input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar por nombre, teléfono o etiqueta"
            className="h-10 border-0 bg-transparent pl-9 text-sm shadow-none focus-visible:ring-0 placeholder:text-[#8696a0]"
          />
        </div>
      </div>

      <div className="shrink-0 border-b border-[#e9edef] bg-white px-3 pb-3">
        <div className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-[#8696a0]">
          <SlidersHorizontal className="h-3 w-3" />
          Filtrar
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {chips.map((chip) => (
            <button
              key={chip.id}
              type="button"
              onClick={() => onFilterChange(chip.id)}
              className={cn(
                "shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-all",
                activeFilter === chip.id
                  ? "bg-primary text-white shadow-sm shadow-primary/20"
                  : "bg-[#f0f2f5] text-[#54656f] hover:bg-[#e9edef]"
              )}
            >
              {chip.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setShowNewLabel((v) => !v)}
            className={cn(
              "shrink-0 inline-flex items-center gap-1 rounded-full border px-2.5 py-1.5 text-[11px] transition-colors",
              showNewLabel
                ? "border-primary bg-primary/10 text-primary"
                : "border-dashed border-[#c4ccd0] text-[#8696a0] hover:bg-[#f0f2f5]"
            )}
          >
            {showNewLabel ? <X className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
            Etiqueta
          </button>
        </div>
        {showNewLabel ? (
          <div className="mt-2 flex items-center gap-2 rounded-xl border border-[#e9edef] bg-[#f8f9fa] p-2">
            <Input
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              placeholder="Ej. Seguimiento, VIP, Pendiente pago"
              className="h-8 flex-1 border-0 bg-white text-sm shadow-none focus-visible:ring-1"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  void onAddLabel(newLabel).then((ok) => {
                    if (ok) {
                      setNewLabel("");
                      setShowNewLabel(false);
                      toast.success("Etiqueta creada");
                    } else toast.error("Etiqueta vacía o duplicada");
                  });
                }
                if (e.key === "Escape") {
                  setNewLabel("");
                  setShowNewLabel(false);
                }
              }}
            />
            <Button
              type="button"
              size="sm"
              className="h-8 shrink-0"
              onClick={() => {
                void onAddLabel(newLabel).then((ok) => {
                  if (ok) {
                    setNewLabel("");
                    setShowNewLabel(false);
                    toast.success("Etiqueta creada");
                  } else toast.error("Etiqueta vacía o duplicada");
                });
              }}
            >
              Crear
            </Button>
          </div>
        ) : null}
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 bg-white">
        {isLoading ? (
          <div className="space-y-0">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3.5 animate-pulse border-b border-[#f0f2f5]">
                <div className="h-12 w-12 rounded-full bg-[#e9edef]" />
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="h-3 w-2/3 rounded bg-[#e9edef]" />
                  <div className="h-2.5 w-full rounded bg-[#f0f2f5]" />
                </div>
              </div>
            ))}
          </div>
        ) : contacts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-6">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#f0f2f5]">
              <MessageSquare className="h-8 w-8 text-[#c4ccd0]" strokeWidth={1.2} />
            </div>
            <p className="text-sm font-semibold text-[#54656f]">Sin conversaciones</p>
            <p className="mt-1 text-xs text-[#8696a0] max-w-[220px] leading-relaxed">
              Los mensajes de WhatsApp se guardan aquí aunque el cliente no complete una solicitud.
            </p>
          </div>
        ) : (
          contacts.map((c) => (
            <ContactItem
              key={c.contactId}
              contact={c}
              isActive={c.contactId === selectedContactId}
              onClick={() => onSelect(c.contactId)}
            />
          ))
        )}
      </div>
    </aside>
  );
}

/* ─── ChatArea ────────────────────────────────────────────── */

function ChatArea({
  selectedContactId,
  activeContact,
  botMuted,
  botMutedUntil,
  onToggleBot,
  catalogLabels,
  onSend,
}: {
  selectedContactId: string | null;
  activeContact: ContactRow | null;
  botMuted: boolean;
  botMutedUntil: string | null;
  onToggleBot: () => void;
  catalogLabels: Array<{ _id: string; name: string; color?: string | null }>;
  onSend: (args: {
    content?: string;
    mediaStorageId?: Id<"_storage">;
    mediaType?: "image" | "audio" | "document";
    filename?: string;
  }) => Promise<void>;
}) {
  const messages = useQuery(
    api.ycloudState.listMessagesByContact,
    selectedContactId ? { contactId: selectedContactId, limit: 300 } : "skip"
  );

  if (!selectedContactId || !activeContact) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center bg-linear-to-b from-[#f0f2f5] to-[#e7ebee] gap-5">
        <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-white shadow-md ring-1 ring-black/5">
          <img src="/logo.png" alt="Peretantico" className="h-16 w-16 object-contain" />
        </div>
        <div className="max-w-sm text-center">
          <p className="text-2xl font-semibold tracking-tight text-[#111b21]">Peretántico</p>
          <p className="mt-2 text-sm leading-relaxed text-[#667781]">
            Gestiona conversaciones de WhatsApp, guarda nombres de clientes, aplica etiquetas y revisa el historial completo.
          </p>
        </div>
      </div>
    );
  }

  const title = contactTitle(activeContact);

  return (
    <div className="flex flex-1 min-h-0 flex-col bg-[#f0f2f5]">
      <ChatHeader
        contactId={selectedContactId}
        title={title}
        phone={formatPhoneDisplay(activeContact.contactId)}
        whatsappName={activeContact.customerName}
        resolvedName={activeContact.resolvedName ?? activeContact.displayName}
        labels={activeContact.labels ?? []}
        catalogLabels={catalogLabels}
        pipelineStage={activeContact.pipelineStage}
        botMuted={botMuted}
        botMutedUntil={botMutedUntil}
        onToggleBot={onToggleBot}
      />

      {activeContact.needsHuman ? (
        <div className="flex items-start gap-2 border-b border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div className="min-w-0">
            <p className="font-semibold">Requiere atención humana</p>
            <p className="text-[13px] text-red-600">
              {activeContact.escalationReason ?? "El bot no pudo continuar el flujo."} Reactiva el bot cuando termines.
            </p>
          </div>
        </div>
      ) : null}

      <ChatMessageList messages={messages ?? []} />
      <ChatComposer contactId={selectedContactId} onSend={onSend} />
    </div>
  );
}

/* ─── Page ────────────────────────────────────────────────── */

export function InboxPage() {
  const isMobile = useIsMobile();
  const [search, setSearch] = useState("");
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [showChat, setShowChat] = useState(false);
  const [activeFilter, setActiveFilter] = useState<ConversationFilterId>("all");

  const { markRead } = useReadConversations();
  const addInboxLabel = useMutation(api.conversationState.addInboxLabel);
  const catalogLabels = useQuery(api.conversationState.listInboxLabels) ?? [];

  const listArgs = useMemo(() => {
    const base: {
      limit: number;
      search?: string;
      pipelineStage?: "visitante" | "en_proceso" | "solicitud";
      label?: string;
    } = { limit: 80 };
    if (search.trim()) base.search = search.trim();
    if (isPipelineFilter(activeFilter)) base.pipelineStage = activeFilter;
    else if (!isBuiltinFilter(activeFilter)) base.label = activeFilter;
    return base;
  }, [search, activeFilter]);

  const contacts = useQuery(api.conversationState.listContacts, listArgs);
  const sendManualMessage = useAction(api.ycloudBot.sendManualMessage);
  const setHandoff = useMutation(api.ycloudState.setHandoff);
  const handoff = useQuery(
    api.ycloudState.getHandoff,
    selectedContactId ? { contactId: selectedContactId } : "skip"
  );

  const filteredContacts = useMemo(() => {
    const list = (contacts ?? []) as ContactRow[];
    return list.filter((c) => matchesClientFilter(c, activeFilter));
  }, [contacts, activeFilter]);

  const activeContact = useMemo(
    () => filteredContacts.find((c) => c.contactId === selectedContactId) ?? (contacts ?? []).find((c) => c.contactId === selectedContactId) ?? null,
    [filteredContacts, contacts, selectedContactId]
  );

  useEffect(() => {
    if (!selectedContactId && filteredContacts.length) {
      setSelectedContactId(filteredContacts[0].contactId);
    }
  }, [filteredContacts, selectedContactId]);

  useEffect(() => {
    if (selectedContactId) markRead(selectedContactId);
  }, [selectedContactId, markRead]);

  const botMuted = handoff?.effectiveMuted === true;
  const botMutedUntil =
    handoff?.mutedUntil && botMuted ? formatMessageTimeLong(handoff.mutedUntil) : null;

  async function handleAddLabel(name: string): Promise<boolean> {
    const trimmed = name.trim();
    if (!trimmed) return false;
    if (catalogLabels.some((l) => l.name.toLowerCase() === trimmed.toLowerCase())) return false;
    try {
      await addInboxLabel({ name: trimmed });
      return true;
    } catch {
      return false;
    }
  }

  async function handleSend(args: {
    content?: string;
    mediaStorageId?: Id<"_storage">;
    mediaType?: "image" | "audio" | "document";
    filename?: string;
  }) {
    if (!selectedContactId) return;
    try {
      await sendManualMessage({
        contactId: selectedContactId,
        content: args.content,
        mediaStorageId: args.mediaStorageId,
        mediaType: args.mediaType,
        filename: args.filename,
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo enviar el mensaje.");
      throw err;
    }
  }

  async function handleToggleBot() {
    if (!selectedContactId) return;
    try {
      if (botMuted) {
        await setHandoff({ contactId: selectedContactId, muted: false });
        toast.success("Bot reactivado");
      } else {
        await setHandoff({ contactId: selectedContactId, muted: true, durationMs: 7_200_000 });
        toast.success("Bot pausado");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al actualizar bot");
    }
  }

  const sidebar = (
    <ConversationSidebar
      contacts={filteredContacts}
      selectedContactId={selectedContactId}
      isLoading={contacts === undefined}
      search={search}
      onSearchChange={setSearch}
      activeFilter={activeFilter}
      onFilterChange={setActiveFilter}
      catalogLabels={catalogLabels}
      onAddLabel={handleAddLabel}
      onSelect={(id) => {
        setSelectedContactId(id);
        if (isMobile) setShowChat(true);
      }}
      totalCount={(contacts ?? []).length}
    />
  );

  const chat = (
    <ChatArea
      selectedContactId={selectedContactId}
      activeContact={activeContact}
      botMuted={botMuted}
      botMutedUntil={botMutedUntil}
      onToggleBot={() => void handleToggleBot()}
      catalogLabels={catalogLabels}
      onSend={handleSend}
    />
  );

  if (isMobile) {
    return (
      <div className="flex h-full flex-col overflow-hidden">
        <SidebarHeader title="Conversaciones" />
        <div className="flex flex-1 min-h-0 flex-col overflow-hidden">
          {!showChat ? (
            sidebar
          ) : (
            <div className="flex flex-1 min-h-0 flex-col">
              <div className="flex h-[56px] shrink-0 items-center gap-2 border-b border-[#e9edef] bg-white px-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 text-[#54656f]"
                  onClick={() => setShowChat(false)}
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                {activeContact ? (
                  <>
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="bg-primary text-xs font-semibold text-primary-foreground">
                        {contactInitials(contactTitle(activeContact))}
                      </AvatarFallback>
                    </Avatar>
                    <span className="truncate text-sm font-semibold text-[#111b21]">
                      {contactTitle(activeContact)}
                    </span>
                  </>
                ) : null}
              </div>
              {chat}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <SidebarHeader title="Conversaciones" />
      <div className="flex flex-1 min-h-0 overflow-hidden rounded-t-xl border-t border-[#e9edef] shadow-sm">
        {sidebar}
        {chat}
      </div>
    </div>
  );
}
