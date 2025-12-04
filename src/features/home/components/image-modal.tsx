import { useEffect } from "react";
import { X } from "lucide-react";

interface ImageModalProps {
  isOpen: boolean;
  imageUrl: string;
  caption: string;
  onClose: () => void;
}

export function ImageModal({
  isOpen,
  imageUrl,
  caption,
  onClose,
}: ImageModalProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[1000] pt-12 overflow-auto bg-black/85 backdrop-blur-sm animate-in fade-in duration-300"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-5 right-9 text-gray-100 text-4xl font-bold transition-colors hover:text-gray-400 cursor-pointer"
        aria-label="Cerrar modal"
      >
        <X className="w-10 h-10" />
      </button>

      <img
        src={imageUrl}
        alt={caption}
        className="mx-auto block max-w-[90%] max-h-[85vh] rounded-lg shadow-2xl animate-in zoom-in duration-300"
        onClick={(e) => e.stopPropagation()}
      />

      <div className="mx-auto block w-4/5 max-w-[700px] text-center text-gray-300 py-2.5">
        {caption}
      </div>
    </div>
  );
}
