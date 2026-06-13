"use client";

import { cn } from "@/lib/utils";
import { FileText, Mic } from "lucide-react";

export type ChatMessage = {
  _id: string;
  direction: "INBOUND" | "OUTBOUND";
  content: string;
  mediaUrl?: string | null;
  mediaType?: "image" | "video" | "audio" | "document" | null;
  createdAt: number;
};

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString("es-CO", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ChatMessageBubble({ message }: { message: ChatMessage }) {
  const isOut = message.direction === "OUTBOUND";
  const mediaUrl = message.mediaUrl?.trim() || null;
  const mediaType = message.mediaType;
  const text = message.content?.trim() ?? "";

  return (
    <div className={cn("flex mb-1", isOut ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "relative max-w-[65%] rounded-lg px-3 pt-2 pb-1.5 text-sm shadow-sm",
          isOut
            ? "bg-primary/10 text-[#111b21] rounded-tr-none"
            : "bg-white text-[#111b21] rounded-tl-none"
        )}
        style={{ minWidth: 80 }}
      >
        {/* Triangle tip */}
        {isOut ? (
          <span
            className="absolute -right-2 top-0 h-4 w-4 overflow-hidden"
            aria-hidden
          >
            <span className="absolute left-0 top-0 h-4 w-4 origin-top-left rotate-45 bg-primary/10" />
          </span>
        ) : (
          <span
            className="absolute -left-2 top-0 h-4 w-4 overflow-hidden"
            aria-hidden
          >
            <span className="absolute right-0 top-0 h-4 w-4 origin-top-right -rotate-45 bg-white" />
          </span>
        )}

        {/* Image */}
        {mediaType === "image" && mediaUrl ? (
          <a href={mediaUrl} target="_blank" rel="noreferrer" className="block mb-1 -mx-1">
            <img
              src={mediaUrl}
              alt="Imagen"
              className="max-h-60 w-full rounded-md object-cover"
            />
          </a>
        ) : null}

        {/* Audio */}
        {mediaType === "audio" && mediaUrl ? (
          <div className="flex items-center gap-2 py-1 mb-1">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <Mic className="h-4 w-4" />
            </div>
            <audio controls src={mediaUrl} className="h-9 max-w-[180px]" preload="metadata" />
          </div>
        ) : null}

        {/* Document / PDF */}
        {mediaType === "document" && mediaUrl ? (
          <a
            href={mediaUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2.5 rounded-md bg-[#f0f2f5] px-3 py-2.5 mb-1"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <FileText className="h-4 w-4" />
            </div>
            <span className="text-xs font-medium text-[#111b21] underline underline-offset-2">
              Abrir documento
            </span>
          </a>
        ) : null}

        {/* Video */}
        {mediaType === "video" && mediaUrl ? (
          <video
            controls
            src={mediaUrl}
            className="max-h-56 w-full rounded-md mb-1"
            preload="metadata"
          />
        ) : null}

        {/* Unknown media link */}
        {mediaUrl && !mediaType ? (
          <a
            href={mediaUrl}
            target="_blank"
            rel="noreferrer"
            className="block text-xs font-medium text-blue-600 underline mb-1"
          >
            Ver archivo
          </a>
        ) : null}

        {/* Text + timestamp */}
        <div className="flex flex-wrap items-end gap-x-3 gap-y-0.5">
          {text ? (
            <p className="min-w-0 whitespace-pre-wrap wrap-break-word leading-relaxed">{text}</p>
          ) : null}
          <span
            className={cn(
              "shrink-0 pb-px text-[10px] leading-none tabular-nums text-[#667781] select-none",
              !text && "ml-auto"
            )}
          >
            {formatTime(message.createdAt)}
          </span>
        </div>
      </div>
    </div>
  );
}
