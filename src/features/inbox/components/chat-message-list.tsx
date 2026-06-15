"use client";

import { useEffect, useMemo, useRef } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChatMessageBubble, type ChatMessage } from "./chat-message-bubble";

function formatDayLabel(ts: number) {
  const date = new Date(ts);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday.getTime() - 86_400_000);

  if (date >= startOfToday) return "Hoy";
  if (date >= startOfYesterday) return "Ayer";
  return date.toLocaleDateString("es-CO", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function dayKey(ts: number) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

export function ChatMessageList({ messages }: { messages: ChatMessage[] }) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const grouped = useMemo(() => {
    const items: Array<{ type: "day"; key: string; label: string } | { type: "msg"; message: ChatMessage }> =
      [];
    let lastDay = "";
    for (const message of messages) {
      const key = dayKey(message.createdAt);
      if (key !== lastDay) {
        lastDay = key;
        items.push({ type: "day", key, label: formatDayLabel(message.createdAt) });
      }
      items.push({ type: "msg", message });
    }
    return items;
  }, [messages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <ScrollArea className="flex-1 min-h-0 bg-[#efeae2]">
      <div
        className="min-h-full space-y-1.5 px-4 py-5 md:px-10"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgba(0,0,0,0.04) 1px, transparent 0)",
          backgroundSize: "24px 24px",
        }}
      >
        {grouped.length === 0 ? (
          <div className="flex justify-center py-10">
            <span className="rounded-xl bg-white/90 px-4 py-2.5 text-xs text-[#667781] shadow-sm">
              Sin mensajes — el historial se guarda automáticamente
            </span>
          </div>
        ) : (
          grouped.map((item) =>
            item.type === "day" ? (
              <div key={item.key} className="flex justify-center py-2">
                <span className="rounded-lg bg-white/85 px-3 py-1 text-[11px] font-medium text-[#54656f] shadow-sm">
                  {item.label}
                </span>
              </div>
            ) : (
              <ChatMessageBubble key={item.message._id} message={item.message} />
            )
          )
        )}
        <div ref={messagesEndRef} />
      </div>
    </ScrollArea>
  );
}
