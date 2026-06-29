/*
 * Dropzone.tsx
 * -----------------------------------------------------------------------------
 * Drag-and-drop / click-to-browse surface for selecting a single video clip.
 * Purely presentational: it surfaces the chosen File to its parent and renders
 * the current clip's name when one is loaded.
 *
 * Last updated: 2026-06-29 — Initial creation.
 * -----------------------------------------------------------------------------
 */

import { useCallback, useRef, useState } from 'react';
import { UploadCloud, Film } from 'lucide-react';
import type { ClipInfo } from '../types';

interface DropzoneProps {
  info: ClipInfo | null;
  disabled?: boolean;
  onFile: (file: File) => void;
}

export function Dropzone({ info, disabled, onFile }: DropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleFiles = useCallback(
    (files: FileList | null) => {
      const file = files?.[0];
      if (file && file.type.startsWith('video/')) onFile(file);
    },
    [onFile],
  );

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => !disabled && inputRef.current?.click()}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && !disabled && inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        if (!disabled) handleFiles(e.dataTransfer.files);
      }}
      className={[
        'flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-6 py-12 text-center transition',
        disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
        dragging ? 'border-accent bg-accent/5' : 'border-edge hover:border-accent/60',
      ].join(' ')}
    >
      <input
        ref={inputRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      {info ? (
        <>
          <Film className="h-8 w-8 text-accent" />
          <p className="font-medium text-slate-100">{info.fileName}</p>
          <p className="text-sm text-slate-400">
            {info.width}×{info.height} · {info.durationSec.toFixed(2)}s — click to replace
          </p>
        </>
      ) : (
        <>
          <UploadCloud className="h-9 w-9 text-slate-400" />
          <p className="font-medium text-slate-100">Drop a video clip or click to browse</p>
          <p className="text-sm text-slate-400">MP4 (H.264) or WebM work best · processed locally, never uploaded</p>
        </>
      )}
    </div>
  );
}
