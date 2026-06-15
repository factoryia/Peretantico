import { useCallback, useEffect, useState } from "react";

export type ConversationFilterId =
  | "all"
  | "visitante"
  | "en_proceso"
  | "solicitud"
  | "needsHuman"
  | "bot"
  | "agent"
  | string;

export const BUILTIN_FILTERS: Array<{ id: ConversationFilterId; label: string }> = [
  { id: "all", label: "Todas" },
  { id: "visitante", label: "Sin solicitud" },
  { id: "en_proceso", label: "En proceso" },
  { id: "solicitud", label: "Con solicitud" },
  { id: "needsHuman", label: "Requiere atención" },
  { id: "bot", label: "Bot activo" },
  { id: "agent", label: "Atención humana" },
];

const READ_KEY = "peretantico.conversation-read.v1";

export function useReadConversations() {
  const [readIds, setReadIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(READ_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as string[];
      if (Array.isArray(parsed)) setReadIds(new Set(parsed));
    } catch {
      /* ignore */
    }
  }, []);

  const markRead = useCallback((contactId: string) => {
    setReadIds((prev) => {
      const next = new Set(prev);
      next.add(contactId);
      window.localStorage.setItem(READ_KEY, JSON.stringify([...next]));
      return next;
    });
  }, []);

  const isRead = useCallback((contactId: string) => readIds.has(contactId), [readIds]);

  return { markRead, isRead };
}

export function isPipelineFilter(
  filter: ConversationFilterId
): filter is "visitante" | "en_proceso" | "solicitud" {
  return filter === "visitante" || filter === "en_proceso" || filter === "solicitud";
}

export function isBuiltinFilter(filter: ConversationFilterId): boolean {
  return BUILTIN_FILTERS.some((f) => f.id === filter);
}
