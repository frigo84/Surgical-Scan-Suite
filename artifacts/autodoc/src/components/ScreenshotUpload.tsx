"use client";

import { useRef, useCallback } from "react";
import { Upload, X, CheckCircle2, AlertCircle, ImageIcon, Loader2 } from "lucide-react";

export type ScreenStatus = "empty" | "ready" | "extracting" | "extracted" | "error";

export interface ScreenSlot {
  id: string;
  title: string;
  description: string;
  required: boolean;
  file: File | null;
  preview: string | null;
  status: ScreenStatus;
}

interface ScreenshotCardProps {
  slot: ScreenSlot;
  onFile: (id: string, file: File) => void;
  onClear: (id: string) => void;
  hasError?: boolean;
}

function StatusBadge({ status }: { status: ScreenStatus }) {
  if (status === "empty") return null;
  const map: Record<ScreenStatus, { label: string; cls: string; icon: React.ReactNode }> = {
    empty: { label: "", cls: "", icon: null },
    ready: {
      label: "Ready",
      cls: "bg-success/10 border-success/20 text-success",
      icon: <CheckCircle2 size={10} />,
    },
    extracting: {
      label: "Extracting…",
      cls: "bg-warning/10 border-warning/20 text-warning",
      icon: <Loader2 size={10} className="animate-spin" />,
    },
    extracted: {
      label: "Extracted",
      cls: "bg-accent/10 border-accent/20 text-accent",
      icon: <CheckCircle2 size={10} />,
    },
    error: {
      label: "Needs review",
      cls: "bg-red-500/10 border-red-500/20 text-red-400",
      icon: <AlertCircle size={10} />,
    },
  };
  const { label, cls, icon } = map[status];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-medium ${cls}`}>
      {icon}
      {label}
    </span>
  );
}

function ScreenshotCard({ slot, onFile, onClear, hasError }: ScreenshotCardProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    (file: File) => {
      if (!file.type.startsWith("image/")) return;
      onFile(slot.id, file);
    },
    [slot.id, onFile]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  return (
    <div
      className={`flex flex-col rounded-2xl border bg-surface-800/50 overflow-hidden transition-colors ${
        hasError
          ? "border-red-500/40"
          : slot.preview
          ? "border-surface-600"
          : "border-surface-600 hover:border-surface-500"
      }`}
    >
      <div className="flex items-start justify-between px-4 pt-4 pb-3 border-b border-surface-700/50">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-200">{slot.title}</span>
            <span
              className={`text-[10px] font-medium px-1.5 py-0.5 rounded-md border ${
                slot.required
                  ? "bg-red-500/10 border-red-500/20 text-red-400"
                  : "bg-surface-700 border-surface-600 text-slate-500"
              }`}
            >
              {slot.required ? "Required" : "Optional"}
            </span>
            <StatusBadge status={slot.status} />
          </div>
          <p className="text-[11px] text-slate-500 leading-relaxed max-w-xs">
            {slot.description}
          </p>
        </div>
      </div>

      <div className="flex-1 relative">
        {slot.preview ? (
          <div className="relative group h-44">
            <img
              src={slot.preview}
              alt={slot.title}
              className="w-full h-full object-contain bg-surface-900/60"
            />
            <div className="absolute inset-0 bg-surface-900/0 group-hover:bg-surface-900/40 transition-all flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
              <button
                onClick={() => inputRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-800/90 border border-surface-600 text-xs text-slate-200 hover:border-accent/40 transition-all"
              >
                <Upload size={11} />
                Change
              </button>
              <button
                onClick={() => onClear(slot.id)}
                className="p-1.5 rounded-lg bg-surface-800/90 border border-surface-600 text-slate-400 hover:text-red-400 hover:border-red-500/40 transition-all"
              >
                <X size={13} />
              </button>
            </div>
            <div className="absolute bottom-2 right-2">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-surface-900/80 border border-surface-700 text-accent text-[10px] font-medium">
                <ImageIcon size={9} />
                Loaded
              </span>
            </div>
          </div>
        ) : (
          <div
            className="h-44 flex flex-col items-center justify-center gap-3 cursor-pointer text-center px-6"
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
          >
            <div className="p-3 rounded-xl bg-surface-700 border border-surface-600 text-slate-500">
              <Upload size={20} />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-400">Drop image or tap to browse</p>
              <p className="text-[10px] text-slate-600 mt-0.5">PNG, JPG, TIFF</p>
            </div>
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
            e.target.value = "";
          }}
        />
      </div>
    </div>
  );
}

interface ScreenshotUploadProps {
  slots: ScreenSlot[];
  onFile: (id: string, file: File) => void;
  onClear: (id: string) => void;
  errors: string[];
}

export function ScreenshotUpload({ slots, onFile, onClear, errors }: ScreenshotUploadProps) {
  return (
    <div className="flex flex-col gap-4">
      {errors.length > 0 && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/5 border border-red-500/20 text-red-400 text-sm">
          <AlertCircle size={14} />
          <span>{errors.join(" · ")}</span>
        </div>
      )}
      <div className="grid grid-cols-2 gap-4">
        {slots.map((slot) => (
          <ScreenshotCard
            key={slot.id}
            slot={slot}
            onFile={onFile}
            onClear={onClear}
            hasError={errors.some((e) =>
              e.toLowerCase().includes(slot.title.toLowerCase().split(" ")[0].toLowerCase())
            )}
          />
        ))}
      </div>
    </div>
  );
}
