import { Images } from "lucide-react";
import { useState } from "react";
import { ImageModal } from "./image-modal";

export interface Attachment {
  url: string;
  label: string;
  alt: string;
}

interface AttachmentsCardProps {
  attachments: Attachment[];
}

export function AttachmentsCard({ attachments }: AttachmentsCardProps) {
  const [selectedImage, setSelectedImage] = useState<Attachment | null>(null);

  return (
    <>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden h-full">
        <div className="px-5 py-4 bg-gray-50 border-b border-gray-200 text-lg font-semibold flex items-center gap-2.5">
          <Images className="w-5 h-5 text-blue-600" />
          Documentos Adjuntos
        </div>
        <div className="p-5">
          <p className="text-gray-500 text-sm mb-4">
            Haga clic en la imagen para ampliar.
          </p>

          <div className="grid grid-cols-[repeat(auto-fill,minmax(100px,1fr))] gap-4">
            {attachments.map((attachment, index) => (
              <div key={index}>
                <div
                  className="relative h-[100px] rounded-lg overflow-hidden border-2 border-gray-200 cursor-pointer transition-all duration-200 hover:scale-105 hover:border-blue-600"
                  onClick={() => setSelectedImage(attachment)}
                >
                  <img
                    src={attachment.url}
                    alt={attachment.alt}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="text-xs text-center mt-1.5 text-gray-500">
                  {attachment.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <ImageModal
        isOpen={!!selectedImage}
        imageUrl={selectedImage?.url || ""}
        caption={selectedImage?.label || ""}
        onClose={() => setSelectedImage(null)}
      />
    </>
  );
}
