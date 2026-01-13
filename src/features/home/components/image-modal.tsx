"use client";

import { useEffect, useState, useRef } from "react";
import { X, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

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
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

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

  const handleZoomIn = () => setScale((prev) => Math.min(prev + 0.5, 4));
  const handleZoomOut = () => {
    setScale((prev) => {
      const newScale = Math.max(prev - 0.5, 1);
      if (newScale === 1) setPosition({ x: 0, y: 0 });
      return newScale;
    });
  };
  const handleReset = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (e.deltaY < 0) handleZoomIn();
    else handleZoomOut();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-1000 flex flex-col items-center justify-center bg-black/90 backdrop-blur-md"
        onClick={onClose}
      >
        {/* Toolbar */}
        <div
          className="absolute top-6 left-1/2 -translate-x-1/2 flex items-center gap-4 px-6 py-2 bg-white/10 backdrop-blur-xl border border-white/20 rounded-full z-1001"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={handleZoomOut}
            className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-all"
            title="Alejar"
          >
            <ZoomOut className="w-5 h-5" />
          </button>

          <span className="text-white text-sm font-medium min-w-12 text-center">
            {Math.round(scale * 100)}%
          </span>

          <button
            onClick={handleZoomIn}
            className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-all"
            title="Acercar"
          >
            <ZoomIn className="w-5 h-5" />
          </button>

          <div className="w-px h-6 bg-white/20 mx-1" />

          <button
            onClick={handleReset}
            className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-all"
            title="Reiniciar"
          >
            <RotateCcw className="w-5 h-5" />
          </button>
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 text-white/50 hover:text-white hover:bg-white/10 rounded-full transition-all z-1001"
          aria-label="Cerrar modal"
        >
          <X className="w-8 h-8" />
        </button>

        {/* Image Container */}
        <div
          ref={containerRef}
          className="relative w-full h-full flex items-center justify-center overflow-hidden cursor-grab active:cursor-grabbing"
          onWheel={handleWheel}
        >
          <motion.img
            src={imageUrl}
            alt={caption}
            drag={scale > 1}
            dragConstraints={containerRef}
            animate={{
              scale: scale,
              x: position.x,
              y: position.y,
            }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="max-w-[90%] max-h-[85vh] rounded-sm select-none"
            onClick={(e) => e.stopPropagation()}
            onDragEnd={(_, info) => {
              setPosition({
                x: position.x + info.offset.x,
                y: position.y + info.offset.y,
              });
            }}
          />
        </div>

        {/* Footer */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-4/5 max-w-[700px] text-center pointer-events-none">
          <p className="text-white/80 text-lg font-medium drop-shadow-lg">
            {caption}
          </p>
          <p className="text-white/40 text-sm mt-1 uppercase tracking-widest">
            Usa el scroll o los controles para hacer zoom
          </p>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
