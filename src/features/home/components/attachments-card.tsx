import { ExternalLink, FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ServiceType } from "@/types/global";

export interface Attachment {
  id?: string;
  url: string;
  label: string;
  alt: string;
  kind?: "service_field" | "payment_receipt" | "evidence" | "other";
  fieldId?: string;
  fieldName?: string;
}

export interface AttachmentGroup {
  key: string;
  title: string;
  items: Attachment[];
}

interface AttachmentsCardProps {
  attachments?: Attachment[];
  groups?: AttachmentGroup[];
  type: ServiceType;
}

export function AttachmentsCard({ attachments = [], groups, type }: AttachmentsCardProps) {
  const renderTitle = () => {
    switch (type) {
      case "node--civil_registry_request":
        return "Documentos Soporte";
      case "node--death_certificate_request":
        return "Documentos Cargados";
      case "node--marriage_certificate_request":
        return "Documentos Soporte";
      case "node--request_medication":
        return "Documentos Adjuntos";
      default:
        return "Documentos Adjuntos";
    }
  };

  const resolvedGroups =
    groups && groups.length > 0
      ? groups
      : attachments.length > 0
        ? [{ key: "default", title: renderTitle(), items: attachments }]
        : [];

  return (
    <div className="bg-white overflow-hidden h-full px-6 py-7 border-b">
      <div className="text-[#6B7280] text-[12.8px] uppercase font-semibold flex items-center gap-2.5 pb-4">
        <FolderOpen className="w-5 h-5 text-blue-600" />
        {renderTitle()}
      </div>
      <div>
        {resolvedGroups.length === 0 ? (
          <p className="text-gray-400 text-sm text-center italic py-4">
            No hay documentos adjuntos.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {resolvedGroups.map((group) => (
              <div key={group.key} className="space-y-2 rounded-lg border border-slate-200 bg-slate-50/70 p-3">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {group.title}
                </div>
                <div className="flex flex-col gap-2">
                  {group.items.map((attachment, index) => (
                    <Button
                      key={attachment.id ?? `${group.key}-${index}`}
                      variant="outline"
                      className="w-full justify-between h-auto py-3 px-4 bg-white group hover:border-blue-500 hover:text-blue-600"
                      asChild
                    >
                      <a
                        href={attachment.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center"
                      >
                        <span className="truncate mr-2 font-normal">
                          {attachment.label}
                        </span>
                        <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-blue-600 shrink-0" />
                      </a>
                    </Button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
