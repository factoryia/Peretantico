"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { SidebarHeader } from "@/components/navigation/sidebar-header";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { SearchInput } from "@/components/common/search-input";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";

function formatMessageTime(ts: number) {
  return new Date(ts).toLocaleString("es-CO", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function InboxPage() {
  const isMobile = useIsMobile();
  const [search, setSearch] = useState("");
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const contacts = useQuery(api.conversationState.listContacts, {
    limit: 50,
    search: search.trim() ? search : undefined,
  });

  const sendManualMessage = useAction(api.ycloudBot.sendManualMessage);

  const activeContact = useMemo(
    () => contacts?.find((c) => c.contactId === selectedContactId) ?? null,
    [contacts, selectedContactId]
  );

  useEffect(() => {
    if (!selectedContactId && contacts?.length) {
      setSelectedContactId(contacts[0].contactId);
    }
  }, [contacts, selectedContactId]);

  const messages = useQuery(
    api.ycloudState.listMessagesByContact,
    selectedContactId ? { contactId: selectedContactId, limit: 200 } : "skip"
  );

  const handoff = useQuery(
    api.ycloudState.getHandoff,
    selectedContactId ? { contactId: selectedContactId } : "skip"
  );
  const setHandoff = useMutation(api.ycloudState.setHandoff);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, selectedContactId]);

  const botMuted = handoff?.effectiveMuted === true;
  const botMutedUntil =
    handoff?.mutedUntil && botMuted ? formatMessageTime(handoff.mutedUntil) : null;

  async function handleSend() {
    const content = message.trim();
    if (!content || !selectedContactId) return;

    try {
      setSending(true);
      await sendManualMessage({ contactId: selectedContactId, content });
      setMessage("");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "No se pudo enviar el mensaje.";
      toast.error(msg);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="h-full flex flex-col">
      <SidebarHeader title="Inbox" />
      <div className="p-5 flex-1 overflow-hidden">
        {/* Mobile: List View */}
        {isMobile && !showChat ? (
          <Card className="h-full overflow-hidden flex flex-col">
            <div className="p-4 border-b">
              <SearchInput
                value={search}
                onValueChange={setSearch}
                placeholder="Buscar por nombre o número..."
                className="md:min-w-0"
              />
            </div>
            <div className="flex-1 overflow-auto">
              <div className="p-2 space-y-1">
                {(contacts ?? []).map((c) => {
                  const title =
                    c.customerName?.trim() ||
                    c.contactId.replace(/^whatsapp:/, "").replace(/^\+/, "");
                  const isActive = c.contactId === selectedContactId;
                  return (
                    <button
                      key={c.contactId}
                      type="button"
                      onClick={() => {
                        setSelectedContactId(c.contactId);
                        setShowChat(true);
                      }}
                      className={cn(
                        "w-full text-left rounded-md px-3 py-2 transition-colors",
                        "hover:bg-muted/60",
                        isActive && "bg-muted"
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-medium text-sm truncate">{title}</div>
                        <div className="text-[11px] text-muted-foreground shrink-0">
                          {formatMessageTime(c.lastMessageAt)}
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {c.lastMessage}
                      </div>
                    </button>
                  );
                })}
                {contacts !== undefined && (contacts?.length ?? 0) === 0 && (
                  <div className="text-sm text-muted-foreground p-3">
                    No hay conversaciones.
                  </div>
                )}
              </div>
            </div>
          </Card>
        ) : null}

        {/* Mobile: Chat View */}
        {isMobile && showChat ? (
          <Card className="h-full overflow-hidden flex flex-col">
            <div className="p-4 border-b flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowChat(false)}
                className="shrink-0"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-sm truncate">
                  {activeContact?.customerName?.trim()
                    ? activeContact.customerName
                    : activeContact?.contactId
                      ? activeContact.contactId.replace(/^whatsapp:/, "")
                      : "Conversación"}
                </div>
                {selectedContactId ? (
                  <div className="text-xs text-muted-foreground">
                    {botMuted ? "Bot pausado" : "Bot activo"}
                  </div>
                ) : null}
              </div>
              <Button
                type="button"
                variant={botMuted ? "outline" : "secondary"}
                size="sm"
                disabled={!selectedContactId}
                onClick={() => {
                  if (!selectedContactId) return;
                  void (async () => {
                    try {
                      if (botMuted) {
                        await setHandoff({ contactId: selectedContactId, muted: false });
                        toast.success("Bot reactivado");
                      } else {
                        await setHandoff({
                          contactId: selectedContactId,
                          muted: true,
                          durationMs: 1000 * 60 * 60 * 2,
                        });
                        toast.success("Bot pausado");
                      }
                    } catch (err) {
                      const msg =
                        err instanceof Error ? err.message : "No se pudo actualizar el bot.";
                      toast.error(msg);
                    }
                  })();
                }}
              >
                {botMuted ? "Reactivar" : "Pausar"}
              </Button>
            </div>

            <div className="flex-1 overflow-auto p-4">
              <div className="space-y-3">
                {(messages ?? []).map((m) => {
                  const isOutbound = m.direction === "OUTBOUND";
                  return (
                    <div
                      key={m._id}
                      className={cn("flex", isOutbound ? "justify-end" : "justify-start")}
                    >
                      <div
                        className={cn(
                          "max-w-[80%] rounded-lg px-3 py-2 text-sm",
                          isOutbound
                            ? "bg-blue-600 text-white"
                            : "bg-white text-slate-900 border"
                        )}
                      >
                        <div className="whitespace-pre-wrap break-words">
                          {m.content}
                        </div>
                        {m.mediaUrl ? (
                          <a
                            href={m.mediaUrl}
                            target="_blank"
                            rel="noreferrer"
                            className={cn(
                              "block text-xs mt-2 underline",
                              isOutbound ? "text-white/90" : "text-blue-700"
                            )}
                          >
                            Ver archivo
                          </a>
                        ) : null}
                        <div
                          className={cn(
                            "mt-1 text-[10px]",
                            isOutbound ? "text-white/70" : "text-muted-foreground"
                          )}
                        >
                          {formatMessageTime(m.createdAt)}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            </div>

            <div className="p-4 border-t">
              <div className="flex gap-2">
                <Input
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Escribe un mensaje..."
                  disabled={!selectedContactId || sending}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void handleSend();
                  }}
                />
                <Button
                  type="button"
                  onClick={() => void handleSend()}
                  disabled={!selectedContactId || sending || !message.trim()}
                  className="shrink-0"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Card>
        ) : null}

        {/* Desktop: Side-by-side layout */}
        {!isMobile && (
          <div className="h-full grid grid-cols-1 md:grid-cols-[320px_1fr] gap-4">
            {/* Contact List */}
            <Card className="h-full overflow-hidden flex flex-col">
              <div className="p-4 border-b">
                <SearchInput
                  value={search}
                  onValueChange={setSearch}
                  placeholder="Buscar por nombre o número..."
                  className="md:min-w-0"
                />
              </div>
              <div className="flex-1 overflow-auto">
                <div className="p-2 space-y-1">
                  {(contacts ?? []).map((c) => {
                    const title =
                      c.customerName?.trim() ||
                      c.contactId.replace(/^whatsapp:/, "").replace(/^\+/, "");
                    const isActive = c.contactId === selectedContactId;
                    return (
                      <button
                        key={c.contactId}
                        type="button"
                        onClick={() => setSelectedContactId(c.contactId)}
                        className={cn(
                          "w-full text-left rounded-md px-3 py-2 transition-colors",
                          "hover:bg-muted/60",
                          isActive && "bg-muted"
                        )}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="font-medium text-sm truncate">{title}</div>
                          <div className="text-[11px] text-muted-foreground shrink-0">
                            {formatMessageTime(c.lastMessageAt)}
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {c.lastMessage}
                        </div>
                      </button>
                    );
                  })}
                    {contacts !== undefined && (contacts?.length ?? 0) === 0 && (
                      <div className="text-sm text-muted-foreground p-3">
                        No hay conversaciones.
                      </div>
                    )}
                  </div>
                </div>
              </Card>

              {/* Chat Card */}
              <Card className="h-full overflow-hidden flex flex-col">
            <div className="p-4 border-b">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-semibold text-sm truncate">
                    {activeContact?.customerName?.trim()
                      ? activeContact.customerName
                      : activeContact?.contactId
                        ? activeContact.contactId.replace(/^whatsapp:/, "")
                        : "Selecciona una conversación"}
                  </div>
                  {selectedContactId ? (
                    <div className="text-xs text-muted-foreground">
                      {botMuted
                        ? botMutedUntil
                          ? `Bot pausado hasta ${botMutedUntil}`
                          : "Bot pausado"
                        : "Bot activo"}
                    </div>
                  ) : null}
                </div>
                <div className="shrink-0">
                  <Button
                    type="button"
                    variant={botMuted ? "outline" : "secondary"}
                    size="sm"
                    disabled={!selectedContactId}
                    onClick={() => {
                      if (!selectedContactId) return;
                      void (async () => {
                        try {
                          if (botMuted) {
                            await setHandoff({ contactId: selectedContactId, muted: false });
                            toast.success("Bot reactivado");
                          } else {
                            await setHandoff({
                              contactId: selectedContactId,
                              muted: true,
                              durationMs: 1000 * 60 * 60 * 2,
                            });
                            toast.success("Bot pausado");
                          }
                        } catch (err) {
                          const msg =
                            err instanceof Error ? err.message : "No se pudo actualizar el bot.";
                          toast.error(msg);
                        }
                      })();
                    }}
                  >
                    {botMuted ? "Reactivar bot" : "Pausar bot"}
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-auto p-4">
              <div className="space-y-3">
                {(messages ?? []).map((m) => {
                  const isOutbound = m.direction === "OUTBOUND";
                  return (
                    <div
                      key={m._id}
                      className={cn("flex", isOutbound ? "justify-end" : "justify-start")}
                    >
                      <div
                        className={cn(
                          "max-w-[80%] rounded-lg px-3 py-2 text-sm",
                          isOutbound
                            ? "bg-blue-600 text-white"
                            : "bg-white text-slate-900 border"
                        )}
                      >
                        <div className="whitespace-pre-wrap break-words">
                          {m.content}
                        </div>
                        {m.mediaUrl ? (
                          <a
                            href={m.mediaUrl}
                            target="_blank"
                            rel="noreferrer"
                            className={cn(
                              "block text-xs mt-2 underline",
                              isOutbound ? "text-white/90" : "text-blue-700"
                            )}
                          >
                            Ver archivo
                          </a>
                        ) : null}
                        <div
                          className={cn(
                            "mt-1 text-[10px]",
                            isOutbound ? "text-white/70" : "text-muted-foreground"
                          )}
                        >
                          {formatMessageTime(m.createdAt)}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            </div>

            <div className="p-4 border-t">
              <div className="flex gap-2">
                <Input
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={
                    selectedContactId
                      ? "Escribe un mensaje..."
                      : "Selecciona una conversación para escribir"
                  }
                  disabled={!selectedContactId || sending}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void handleSend();
                  }}
                />
                <Button
                  type="button"
                  onClick={() => void handleSend()}
                  disabled={!selectedContactId || sending || !message.trim()}
                  className="shrink-0"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Card>
          </div>
        )}
      </div>
    </div>
  );
}
