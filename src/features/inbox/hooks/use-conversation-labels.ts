import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "peretantico.conversation-labels.v1";

export type ConversationFilterId =
  | "all"
  | "read"
  | "bot"
  | "both"
  | string;

type StoredLabels = {
  customLabels: string[];
  contactLabels: Record<string, string[]>;
};

const DEFAULT_STORED: StoredLabels = {
  customLabels: [],
  contactLabels: {},
};

function readStore(): StoredLabels {
  if (typeof window === "undefined") return DEFAULT_STORED;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STORED;
    const parsed = JSON.parse(raw) as StoredLabels;
    return {
      customLabels: Array.isArray(parsed.customLabels) ? parsed.customLabels : [],
      contactLabels:
        parsed.contactLabels && typeof parsed.contactLabels === "object"
          ? parsed.contactLabels
          : {},
    };
  } catch {
    return DEFAULT_STORED;
  }
}

function writeStore(data: StoredLabels) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function useConversationLabels() {
  const [stored, setStored] = useState<StoredLabels>(DEFAULT_STORED);

  useEffect(() => {
    setStored(readStore());
  }, []);

  const persist = useCallback((next: StoredLabels) => {
    setStored(next);
    writeStore(next);
  }, []);

  const addCustomLabel = useCallback(
    (name: string) => {
      const trimmed = name.trim();
      if (!trimmed) return false;
      const exists = stored.customLabels.some(
        (label) => label.toLowerCase() === trimmed.toLowerCase()
      );
      if (exists) return false;
      persist({
        ...stored,
        customLabels: [...stored.customLabels, trimmed],
      });
      return true;
    },
    [persist, stored]
  );

  const setContactLabels = useCallback(
    (contactId: string, labels: string[]) => {
      persist({
        ...stored,
        contactLabels: {
          ...stored.contactLabels,
          [contactId]: labels,
        },
      });
    },
    [persist, stored]
  );

  const getContactLabels = useCallback(
    (contactId: string) => stored.contactLabels[contactId] ?? [],
    [stored.contactLabels]
  );

  return {
    customLabels: stored.customLabels,
    addCustomLabel,
    setContactLabels,
    getContactLabels,
  };
}

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

export const BUILTIN_FILTERS: Array<{ id: ConversationFilterId; label: string }> = [
  { id: "all", label: "Todas" },
  { id: "read", label: "Leídas" },
  { id: "bot", label: "Bot" },
  { id: "both", label: "Ambos" },
];
