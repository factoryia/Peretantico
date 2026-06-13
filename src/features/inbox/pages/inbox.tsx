"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { SidebarHeader } from "@/components/navigation/sidebar-header";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ArrowLeft,
  Bot,
  MessageSquare,
  PauseCircle,
  PlayCircle,
  Search,
  Tag,
  UserRound,
  Plus,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";
import { ChatMessageBubble } from "../components/chat-message-bubble";
import { ChatComposer } from "../components/chat-composer";
import {
  useConversationLabels,
  useReadConversations,
  BUILTIN_FILTERS,
  type ConversationFilterId,
} from "../hooks/use-conversation-labels";
import {
  contactInitials,
  formatListTime,
  formatPhoneDisplay,
} from "../utils/format";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
  lastMessageAt: number;
  lastMessage: string;
  lastDirection: "INBOUND" | "OUTBOUND";
  botMuted?: boolean;
};

function contactTitle(c: ContactRow) {
  return c.customerName?.trim() || formatPhoneDisplay(c.contactId);
}

function matchesFilter(
  contact: ContactRow,
  filter: ConversationFilterId,
  isRead: (id: string) => boolean,
  getContactLabels: (id: string) => string[]
): boolean {
  if (filter === "all") return true;
  if (filter === "read") return isRead(contact.contactId);
  if (filter === "bot") return !contact.botMuted;
  if (filter === "both") return contact.botMuted === true;
  return getContactLabels(contact.contactId).includes(filter);
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

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full max-w-full flex items-center gap-3 px-4 py-3 transition-colors text-left overflow-hidden",
        "hover:bg-[#f5f6f6]",
        isActive ? "bg-[#e9edef]" : "bg-white"
      )}
    >
      {/* Avatar */}
      <Avatar className="h-12 w-12 shrink-0">
        <AvatarFallback
          className={cn(
            "text-sm font-semibold",
            isActive ? "bg-primary text-primary-foreground" : "bg-[#dfe5e7] text-[#54656f]"
          )}
        >
          {contactInitials(title)}
        </AvatarFallback>
      </Avatar>

      {/* Info */}
      <div className="min-w-0 flex-1">
        {/* Row 1: name + time */}
        <div className="flex items-center justify-between gap-2 min-w-0">
          <span
            className={cn(
              "min-w-0 flex-1 truncate text-[15px]",
              isActive ? "font-semibold text-[#111b21]" : "font-medium text-[#111b21]"
            )}
          >
            {title}
          </span>
          <span
            className={cn(
              "shrink-0 text-[11px] tabular-nums",
              isUnread && !isActive ? "text-primary font-semibold" : "text-[#667781]"
            )}
          >
            {formatListTime(contact.lastMessageAt)}
          </span>
        </div>

        {/* Row 2: preview + badges */}
        <div className="flex items-center gap-2 mt-0.5 min-w-0">
          <p className="flex-1 min-w-0 truncate text-[13px] text-[#667781]">{contact.lastMessage}</p>
          <div className="flex shrink-0 items-center gap-1">
            {isUnread && !isActive && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[11px] font-semibold text-primary-foreground" />
            )}
            {contact.botMuted ? (
              <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
                Agente
              </span>
            ) : (
              <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                Bot
              </span>
            )}
          </div>
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
  customLabels,
  onAddLabel,
  onSelect,
}: {
  contacts: ContactRow[];
  selectedContactId: string | null;
  isLoading: boolean;
  search: string;
  onSearchChange: (v: string) => void;
  activeFilter: ConversationFilterId;
  onFilterChange: (f: ConversationFilterId) => void;
  customLabels: string[];
  onAddLabel: (name: string) => boolean;
  onSelect: (id: string) => void;
}) {
  const [newLabel, setNewLabel] = useState("");
  const [showNewLabel, setShowNewLabel] = useState(false);

  function closeNewLabelForm() {
    setNewLabel("");
    setShowNewLabel(false);
  }

  const chips = [
    ...BUILTIN_FILTERS,
    ...customLabels.map((l) => ({ id: l, label: l })),
  ];

  return (
    <aside className="flex h-full w-full min-w-0 flex-col overflow-hidden border-r border-[#e9edef] bg-white md:w-[380px] md:shrink-0">
      {/* Header sidebar */}


      {/* Search */}
      <div className="shrink-0 bg-white px-3 py-2">
        <div className="relative flex items-center rounded-lg bg-[#f0f2f5]">
          <Search className="absolute left-3 h-4 w-4 text-[#54656f]" />
          <Input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar o iniciar nuevo chat"
            className="h-9 border-0 bg-transparent pl-9 text-sm shadow-none focus-visible:ring-0 placeholder:text-[#8696a0]"
          />
        </div>
      </div>

      {/* Filters */}
      <div className="shrink-0 border-b border-[#e9edef] bg-white px-3 pb-2">
        <div className="flex items-center gap-1 mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-[#8696a0]">
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
                "shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-all",
                activeFilter === chip.id
                  ? "bg-primary text-white"
                  : "bg-[#f0f2f5] text-[#54656f] hover:bg-[#e9edef]"
              )}
            >
              {chip.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => (showNewLabel ? closeNewLabelForm() : setShowNewLabel(true))}
            className={cn(
              "shrink-0 inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] transition-colors",
              showNewLabel
                ? "border-primary bg-primary/10 text-primary"
                : "border-dashed border-[#c4ccd0] text-[#8696a0] hover:bg-[#f0f2f5]"
            )}
          >
            {showNewLabel ? <X className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
            {showNewLabel ? "Cerrar" : "Nueva"}
          </button>
        </div>
        {showNewLabel && (
          <div className="mt-2 flex items-center gap-2 rounded-lg border border-[#e9edef] bg-[#f0f2f5]/60 p-2">
            <Input
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              placeholder="Nombre de etiqueta"
              className="h-8 flex-1 border-0 bg-white text-sm shadow-none focus-visible:ring-1"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  const ok = onAddLabel(newLabel);
                  if (ok) {
                    closeNewLabelForm();
                    toast.success("Etiqueta creada");
                  } else toast.error("Etiqueta vacía o duplicada");
                }
                if (e.key === "Escape") closeNewLabelForm();
              }}
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 shrink-0 border-[#c4ccd0] bg-white text-[#54656f] hover:bg-[#f0f2f5]"
              onClick={closeNewLabelForm}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              className="h-8 shrink-0 bg-primary hover:bg-primary/90"
              onClick={() => {
                const ok = onAddLabel(newLabel);
                if (ok) {
                  closeNewLabelForm();
                  toast.success("Etiqueta creada");
                } else toast.error("Etiqueta vacía o duplicada");
              }}
            >
              Crear
            </Button>
          </div>
        )}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0">
        {isLoading ? (
          <div className="space-y-0">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3 animate-pulse">
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
            <MessageSquare className="h-12 w-12 text-[#c4ccd0] mb-3" strokeWidth={1.2} />
            <p className="text-sm font-medium text-[#54656f]">Sin conversaciones</p>
            <p className="mt-1 text-xs text-[#8696a0] max-w-[200px]">
              Los mensajes de WhatsApp aparecerán aquí.
            </p>
          </div>
        ) : (
          <div>
            {contacts.map((c) => (
              <ContactItem
                key={c.contactId}
                contact={c}
                isActive={c.contactId === selectedContactId}
                onClick={() => onSelect(c.contactId)}
              />
            ))}
          </div>
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
  customLabels,
  contactLabels,
  onLabelsChange,
  onSend,
}: {
  selectedContactId: string | null;
  activeContact: ContactRow | null;
  botMuted: boolean;
  botMutedUntil: string | null;
  onToggleBot: () => void;
  customLabels: string[];
  contactLabels: string[];
  onLabelsChange: (l: string[]) => void;
  onSend: (args: {
    content?: string;
    mediaStorageId?: Id<"_storage">;
    mediaType?: "image" | "audio" | "document";
    filename?: string;
  }) => Promise<void>;
}) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messages = useQuery(
    api.ycloudState.listMessagesByContact,
    selectedContactId ? { contactId: selectedContactId, limit: 200 } : "skip"
  );

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, selectedContactId]);

  /* Empty state */
  if (!selectedContactId || !activeContact) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center bg-[#f0f2f5] gap-4">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white shadow-sm">
          <img src="/logo.png" alt="Peretantico" className="w-full h-full object-contain" />
        </div>
        <div className="text-center">
          <p className="text-xl font-light text-[#41525d]">Peretantico</p>
          <p className="mt-1 text-sm text-[#667781]">
            Selecciona una conversación para ver los mensajes
          </p>
        </div>
      </div>
    );
  }

  const title = contactTitle(activeContact);

  return (
    <div className="flex flex-1 min-h-0 flex-col">
      {/* Chat header */}
      <header className="flex h-[60px] shrink-0 items-center gap-3 bg-[#f0f2f5] px-4 border-b border-[#e9edef]">
        <Avatar className="h-10 w-10">
          <AvatarFallback className="bg-primary text-sm font-semibold text-primary-foreground">
            {contactInitials(title)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-semibold text-[#111b21]">{title}</p>
          <p className="truncate text-xs text-[#667781]">
            {formatPhoneDisplay(activeContact.contactId)}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {/* bot status badge */}
          <span
            className={cn(
              "hidden md:inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
              botMuted
                ? "bg-amber-100 text-amber-800"
                : "bg-primary/10 text-primary"
            )}
          >
            {botMuted ? <UserRound className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
            {botMuted ? (botMutedUntil ? `Pausado hasta ${botMutedUntil}` : "Atención humana") : "Bot activo"}
          </span>

          {customLabels.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9 text-[#54656f]">
                  <Tag className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {customLabels.map((label) => (
                  <DropdownMenuCheckboxItem
                    key={label}
                    checked={contactLabels.includes(label)}
                    onCheckedChange={(checked) =>
                      onLabelsChange(
                        checked
                          ? [...contactLabels, label]
                          : contactLabels.filter((l) => l !== label)
                      )
                    }
                  >
                    {label}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleBot}
            className={cn(
              "h-8 text-xs font-medium",
              botMuted
                ? "text-primary hover:bg-primary/10"
                : "text-amber-700 hover:bg-amber-50"
            )}
          >
            {botMuted ? (
              <><PlayCircle className="h-4 w-4 mr-1.5" />Reactivar</>
            ) : (
              <><PauseCircle className="h-4 w-4 mr-1.5" />Pausar bot</>
            )}
          </Button>
        </div>
      </header>

      {/* Messages */}
      <ScrollArea className="flex-1 min-h-0 bg-muted/30">
        <div className="space-y-1.5 px-4 py-5 md:px-8">
          {(messages ?? []).length === 0 ? (
            <div className="flex justify-center py-8">
              <span className="rounded-lg bg-white/80 px-4 py-2 text-xs text-[#667781] shadow-sm">
                Sin mensajes en esta conversación
              </span>
            </div>
          ) : (
            (messages ?? []).map((m) => <ChatMessageBubble key={m._id} message={m} />)
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Composer */}
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

  const { customLabels, addCustomLabel, setContactLabels, getContactLabels } =
    useConversationLabels();
  const { markRead, isRead } = useReadConversations();

  const contacts = useQuery(api.conversationState.listContacts, {
    limit: 50,
    search: search.trim() ? search : undefined,
  });

  const sendManualMessage = useAction(api.ycloudBot.sendManualMessage);
  const setHandoff = useMutation(api.ycloudState.setHandoff);

  const handoff = useQuery(
    api.ycloudState.getHandoff,
    selectedContactId ? { contactId: selectedContactId } : "skip"
  );

  const activeContact = useMemo(
    () => (contacts ?? []).find((c) => c.contactId === selectedContactId) ?? null,
    [contacts, selectedContactId]
  );

  const filteredContacts = useMemo(() => {
    const list = (contacts ?? []) as ContactRow[];
    return list.filter((c) =>
      matchesFilter(c, activeFilter, isRead, getContactLabels)
    );
  }, [contacts, activeFilter, isRead, getContactLabels]);

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
    handoff?.mutedUntil && botMuted
      ? formatMessageTimeLong(handoff.mutedUntil)
      : null;

  const contactLabels = selectedContactId ? getContactLabels(selectedContactId) : [];

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
      const msg = err instanceof Error ? err.message : "No se pudo enviar el mensaje.";
      toast.error(msg);
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
        toast.success("Bot pausado por 2 h");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al actualizar bot");
    }
  }

  /* ── Render ── */

  if (isMobile) {
    return (
      <div className="flex h-full flex-col overflow-hidden">
        <SidebarHeader title="Conversaciones" />
        <div className="flex flex-1 min-h-0 flex-col overflow-hidden">
          {!showChat ? (
            <ConversationSidebar
              contacts={filteredContacts}
              selectedContactId={selectedContactId}
              isLoading={contacts === undefined}
              search={search}
              onSearchChange={setSearch}
              activeFilter={activeFilter}
              onFilterChange={setActiveFilter}
              customLabels={customLabels}
              onAddLabel={addCustomLabel}
              onSelect={(id) => { setSelectedContactId(id); setShowChat(true); }}
            />
          ) : (
            <div className="flex flex-1 min-h-0 flex-col">
              {/* back bar */}
              <div className="flex h-[56px] shrink-0 items-center gap-2 bg-[#f0f2f5] border-b border-[#e9edef] px-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 text-[#54656f]"
                  onClick={() => setShowChat(false)}
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                {activeContact && (
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
                )}
              </div>
              <ChatArea
                selectedContactId={selectedContactId}
                activeContact={activeContact}
                botMuted={botMuted}
                botMutedUntil={botMutedUntil}
                onToggleBot={() => void handleToggleBot()}
                customLabels={customLabels}
                contactLabels={contactLabels}
                onLabelsChange={(l) => { if (selectedContactId) setContactLabels(selectedContactId, l); }}
                onSend={handleSend}
              />
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <SidebarHeader title="Conversaciones" />
      <div className="flex flex-1 min-h-0 overflow-hidden">
        <ConversationSidebar
          contacts={filteredContacts}
          selectedContactId={selectedContactId}
          isLoading={contacts === undefined}
          search={search}
          onSearchChange={setSearch}
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
          customLabels={customLabels}
          onAddLabel={addCustomLabel}
          onSelect={setSelectedContactId}
        />
        <ChatArea
          selectedContactId={selectedContactId}
          activeContact={activeContact}
          botMuted={botMuted}
          botMutedUntil={botMutedUntil}
          onToggleBot={() => void handleToggleBot()}
          customLabels={customLabels}
          contactLabels={contactLabels}
          onLabelsChange={(l) => { if (selectedContactId) setContactLabels(selectedContactId, l); }}
          onSend={handleSend}
        />
      </div>
    </div>
  );
}
