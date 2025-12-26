import { Images, ExternalLink, FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ServiceType } from "@/types/global";

export interface Attachment {
  url: string;
  label: string;
  alt: string;
}

interface AttachmentsCardProps {
  attachments: Attachment[];
  type: ServiceType;
}

export function AttachmentsCard({ attachments, type }: AttachmentsCardProps) {
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

  return (
    <div className="bg-white overflow-hidden h-full px-6 py-7 border-b">
      <div className="text-[#6B7280] text-[12.8px] uppercase font-semibold flex items-center gap-2.5 pb-4">
        <FolderOpen className="w-5 h-5 text-blue-600" />
        {renderTitle()}
      </div>
      <div>
        {attachments.length === 0 ? (
          <p className="text-gray-400 text-sm text-center italic py-4">
            No hay documentos adjuntos.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {attachments.map((attachment, index) => (
              <Button
                key={index}
                variant="outline"
                className="w-full justify-between h-auto py-3 px-4 bg-slate-50 group hover:border-blue-500 hover:text-blue-600 hover:bg-slate-100"
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
        )}
      </div>
    </div>
  );
}
