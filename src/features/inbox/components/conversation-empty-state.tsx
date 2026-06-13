"use client";

import { Inbox, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ConversationEmptyStateProps {
  variant: "list" | "chat";
  className?: string;
}

export function ConversationEmptyState({
  variant,
  className,
}: ConversationEmptyStateProps) {
  const isList = variant === "list";
  const Icon = isList ? Inbox : MessageCircle;

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center px-6 py-10",
        className
      )}
    >
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 ring-1 ring-blue-100">
        <Icon className="h-7 w-7" strokeWidth={1.5} />
      </div>
      <p className="text-sm font-semibold text-slate-800">
        {isList ? "Sin conversaciones" : "Selecciona un chat"}
      </p>
      <p className="mt-1 max-w-[240px] text-xs leading-relaxed text-muted-foreground">
        {isList
          ? "Cuando lleguen mensajes de WhatsApp aparecerán aquí. Prueba otro filtro o espera nuevos contactos."
          : "Elige una conversación de la lista para ver el historial y responder."}
      </p>
    </div>
  );
}
