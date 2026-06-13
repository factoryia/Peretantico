"use client";

import { useRef, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Paperclip, Send, Smile } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const EMOJIS = [
  "😀", "😊", "🙏", "👍", "❤️", "🎉", "✅", "📎",
  "📷", "📄", "🚚", "⏳", "💬", "🙂", "😅", "👋",
  "🤝", "💪", "🙌", "🔥", "⭐", "✨", "💯", "🎁",
];

const ACCEPT =
  "image/jpeg,image/png,image/webp,application/pdf,audio/mpeg,audio/ogg,audio/wav,audio/webm,audio/mp4";

function detectMediaType(file: File): "image" | "audio" | "document" | null {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("audio/")) return "audio";
  if (file.type === "application/pdf") return "document";
  return null;
}

interface ChatComposerProps {
  contactId: string | null;
  disabled?: boolean;
  onSend: (args: {
    content?: string;
    mediaStorageId?: Id<"_storage">;
    mediaType?: "image" | "audio" | "document";
    filename?: string;
  }) => Promise<void>;
}

export function ChatComposer({ contactId, disabled, onSend }: ChatComposerProps) {
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);

  const canSend = Boolean(contactId) && !disabled && !sending;

  async function uploadFile(file: File): Promise<Id<"_storage">> {
    const postUrl = await generateUploadUrl();
    const result = await fetch(postUrl, {
      method: "POST",
      headers: { "Content-Type": file.type || "application/octet-stream" },
      body: file,
    });
    if (!result.ok) throw new Error("No se pudo subir el archivo");
    const { storageId } = (await result.json()) as { storageId: Id<"_storage"> };
    return storageId;
  }

  async function handleSendText() {
    const content = message.trim();
    if (!content || !contactId) return;
    try {
      setSending(true);
      await onSend({ content });
      setMessage("");
    } finally {
      setSending(false);
    }
  }

  async function handleFileChange(file: File | null) {
    if (!file || !contactId) return;
    const mediaType = detectMediaType(file);
    if (!mediaType) {
      toast.error("Formato no soportado. Usa imagen, audio o PDF.");
      return;
    }
    if (file.size > 16 * 1024 * 1024) {
      toast.error("El archivo supera el límite de 16 MB.");
      return;
    }
    try {
      setSending(true);
      const storageId = await uploadFile(file);
      await onSend({
        content: message.trim() || undefined,
        mediaStorageId: storageId,
        mediaType,
        filename: mediaType === "document" ? file.name : undefined,
      });
      setMessage("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo enviar el archivo.");
    } finally {
      setSending(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <div className="shrink-0 flex items-end gap-2 bg-[#f0f2f5] px-3 py-2.5 md:px-4">
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={(e) => void handleFileChange(e.target.files?.[0] ?? null)}
      />

      {/* Emoji + attach */}
      <div className="flex shrink-0 items-center gap-1">
        <Popover open={emojiOpen} onOpenChange={setEmojiOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled={!canSend}
              className="h-10 w-10 text-[#54656f] hover:bg-[#e9edef] hover:text-[#111b21]"
              aria-label="Emojis"
            >
              <Smile className="h-5 w-5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-3" align="start" side="top">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[#8696a0]">
              Emojis
            </p>
            <div className="grid grid-cols-8 gap-0.5">
              {EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  className="rounded p-1.5 text-xl hover:bg-[#f0f2f5]"
                  onClick={() => {
                    setMessage((prev) => prev + emoji);
                    setEmojiOpen(false);
                  }}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          disabled={!canSend}
          className="h-10 w-10 text-[#54656f] hover:bg-[#e9edef] hover:text-[#111b21]"
          aria-label="Adjuntar archivo"
          onClick={() => fileInputRef.current?.click()}
        >
          <Paperclip className="h-5 w-5" />
        </Button>
      </div>

      {/* Text input */}
      <div className="flex flex-1 min-w-0 items-end rounded-lg bg-white shadow-sm">
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={canSend ? "Escribe un mensaje" : "Selecciona una conversación"}
          disabled={!canSend}
          rows={1}
          className={cn(
            "flex-1 min-h-[42px] max-h-36 resize-none rounded-lg bg-transparent px-4 py-2.5 text-sm text-[#111b21]",
            "placeholder:text-[#8696a0] focus:outline-none focus:ring-0",
            "disabled:cursor-not-allowed disabled:opacity-60"
          )}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void handleSendText();
            }
          }}
        />
      </div>

      {/* Send */}
      <Button
        type="button"
        size="icon"
        onClick={() => void handleSendText()}
        disabled={!canSend || !message.trim()}
        className={cn(
          "h-10 w-10 shrink-0 rounded-full transition-all",
          canSend && message.trim()
            ? "bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
            : "bg-[#e9edef] text-[#8696a0]"
        )}
      >
        <Send className="h-4 w-4" />
      </Button>
    </div>
  );
}
