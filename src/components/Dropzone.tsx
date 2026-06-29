/*
 * Dropzone.tsx
 * -----------------------------------------------------------------------------
 * Drag-and-drop / click-to-browse surface for selecting a single video clip.
 * Purely presentational: it surfaces the chosen File to its parent and renders
 * the current clip's name when one is loaded, plus an inline video preview.
 *
 * Last updated: 2026-06-29 — Added MOV support, inline video preview, loaded
 *   state indicator with metadata badge.
 * -----------------------------------------------------------------------------
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { UploadCloud, CheckCircle2, RefreshCw } from 'lucide-react';
import type { ClipInfo } from '../types';

const ACCEPTED = 'video/mp4,video/webm,video/quicktime,video/mov,video/*';

interface DropzoneProps {
  info: ClipInfo | null;
  file: File | null;
  disabled?: boolean;
  onFile: (file: File) => void;
}

export function Dropzone({ info, file, disabled, onFile }: DropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [dragging, setDragging] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const handleFiles = useCallback(
    (files: FileList | null) => {
      const f = files?.[0];
      if (f && f.type.startsWith('video/')) onFile(f);
    },
    [onFile],
  );

  const formatDuration = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = (s % 60).toFixed(1);
    return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-3">
      <div
        role="button"
        tabIndex={0}
        onClick={() => !disabled && inputRef.current?.click()}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && !disabled && inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); if (!disabled) setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); if (!disabled) handleFiles(e.dataTransfer.files); }}
        className={[
          'flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-6 py-8 text-center transition',
          disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
          dragging ? 'border-accent bg-accent/5' : info ? 'border-green-500/40 bg-green-500/5 hover:border-accent/60' : 'border-edge hover:border-accent/60',
        ].join(' ')}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED}
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        {info ? (
          <div className="flex w-full items-center gap-4">
            <CheckCircle2 className="h-8 w-8 shrink-0 text-green-400" />
            <div className="min-w-0 flex-1 text-left">
              <p className="truncate font-medium text-slate-100">{info.fileName}</p>
              <p className="mt-0.5 text-sm text-slate-400">
                {info.width}×{info.height} · {formatDuration(info.durationSec)}
                {file ? ` · ${formatSize(file.size)}` : ''}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1.5 rounded-md border border-edge px-2.5 py-1 text-xs text-slate-400 hover:border-accent/60 hover:text-slate-200 transition">
              <RefreshCw className="h-3 w-3" />
              Replace
            </div>
          </div>
        ) : (
          <>
            <UploadCloud className="h-9 w-9 text-slate-400" />
            <p className="font-medium text-slate-100">Drop a video clip or click to browse</p>
            <p className="text-sm text-slate-400">MP4 · MOV · WebM · processed locally, never uploaded</p>
          </>
        )}
      </div>

      {previewUrl && (
        <video
          ref={videoRef}
          src={previewUrl}
          controls
          muted
          playsInline
          className="w-full rounded-xl border border-edge bg-black"
          style={{ maxHeight: '240px' }}
        />
      )}
    </div>
  );
}
