"use client";

import { useRef, useState, useCallback } from "react";
import { Upload, ImageIcon, X } from "lucide-react";

interface ImageUploaderProps {
  onFileSelect: (file: File) => void;
  preview: string | null;
  onClear: () => void;
}

export function ImageUploader({ onFileSelect, preview, onClear }: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFile = useCallback(
    (file: File) => {
      if (!file.type.startsWith("image/")) return;
      onFileSelect(file);
    },
    [onFileSelect]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
        <span className="text-xs font-medium text-slate-400 uppercase tracking-widest">
          Surgical Screenshot
        </span>
      </div>

      {preview ? (
        <div className="relative flex-1 rounded-2xl overflow-hidden border border-surface-600 group">
          <img
            src={preview}
            alt="Uploaded surgical screenshot"
            className="w-full h-full object-contain bg-surface-800"
          />
          <button
            onClick={onClear}
            className="absolute top-3 right-3 p-1.5 rounded-lg bg-surface-900/80 border border-surface-600 text-slate-400 hover:text-white hover:border-red-500/60 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100"
            aria-label="Remove image"
          >
            <X size={14} />
          </button>
          <div className="absolute bottom-0 inset-x-0 h-12 bg-gradient-to-t from-surface-900/80 to-transparent pointer-events-none" />
          <div className="absolute bottom-3 left-3">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-accent/10 border border-accent/20 text-accent text-xs font-medium">
              <ImageIcon size={11} />
              Image loaded
            </span>
          </div>
        </div>
      ) : (
        <div
          className={`flex-1 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all duration-200 ${
            isDragging
              ? "border-accent bg-accent/5 scale-[0.99]"
              : "border-surface-600 bg-surface-800/40 hover:border-accent/50 hover:bg-surface-800/60"
          }`}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleChange}
          />
          <div className="flex flex-col items-center gap-4 px-8 text-center select-none">
            <div className={`p-5 rounded-2xl border transition-colors duration-200 ${
              isDragging
                ? "bg-accent/15 border-accent/40 text-accent"
                : "bg-surface-700 border-surface-600 text-slate-400"
            }`}>
              <Upload size={28} />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-300 mb-1">
                Drop screenshot here
              </p>
              <p className="text-xs text-slate-500">
                or tap to browse — PNG, JPG, TIFF
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
