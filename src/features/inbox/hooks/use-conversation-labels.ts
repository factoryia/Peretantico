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

/** Filtros de estado del sistema — no son etiquetas personalizadas. */
export const STATE_FILTERS: Array<{ id: ConversationFilterId; label: string }> = [
  { id: "all", label: "Todas" },
  { id: "visitante", label: "Sin solicitud" },
  { id: "en_proceso", label: "En proceso" },
  { id: "solicitud", label: "Con solicitud" },
  { id: "needsHuman", label: "Requiere atención" },
  { id: "bot", label: "Bot activo" },
  { id: "agent", label: "Atención humana" },
];

/** @deprecated Use STATE_FILTERS */
export const BUILTIN_FILTERS = STATE_FILTERS;

export const RESERVED_LABEL_NAMES = new Set(
  STATE_FILTERS.map((f) => f.label.toLowerCase()).concat(
    STATE_FILTERS.map((f) => String(f.id).toLowerCase())
  )
);

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
  return STATE_FILTERS.some((f) => f.id === filter);
}

export function isStateFilter(filter: ConversationFilterId): boolean {
  return isBuiltinFilter(filter);
}
