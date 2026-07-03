/*
 * Dropzone.tsx
 * -----------------------------------------------------------------------------
 * Drag-and-drop / click-to-browse surface for selecting video (single) or
 * images (multiple). Surfaces the chosen File(s) to its parent and renders
 * the appropriate preview (video player or image count badge).
 *
 * Last updated: 2026-07-03 — Added multi-image input mode.
 * -----------------------------------------------------------------------------
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { UploadCloud, CheckCircle2, RefreshCw } from 'lucide-react';
import type { ClipInfo } from '../types';

const ACCEPTED = 'video/mp4,video/webm,video/quicktime,video/mov,video/*,image/jpeg,image/png,image/webp';

interface DropzoneProps {
  info: ClipInfo | null;
  files: File[];
  disabled?: boolean;
  onFiles: (files: File[]) => void;
}

export function Dropzone({ info, files, disabled, onFiles }: DropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [dragging, setDragging] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [inputMode, setInputMode] = useState<'video' | 'images'>('video');

  useEffect(() => {
    if (files.length === 0) {
      setPreviewUrl(null);
      return;
    }
    if (files.length === 1 && files[0].type.startsWith('video/')) {
      const url = URL.createObjectURL(files[0]);
      setPreviewUrl(url);
      setInputMode('video');
      return () => URL.revokeObjectURL(url);
    }
    setPreviewUrl(null);
    setInputMode('images');
  }, [files]);

  const handleFiles = useCallback(
    (fileList: FileList | null) => {
      if (!fileList || fileList.length === 0) return;
      const arr = Array.from(fileList);
      const videos = arr.filter((f) => f.type.startsWith('video/'));
      const images = arr.filter((f) => f.type.startsWith('image/'));
      if (videos.length > 0) {
        onFiles([videos[0]]);
      } else if (images.length > 0) {
        onFiles(images);
      }
    },
    [onFiles],
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
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        {info ? (
          <div className="flex w-full items-center gap-4">
            <CheckCircle2 className="h-8 w-8 shrink-0 text-green-400" />
            <div className="min-w-0 flex-1 text-left">
              <p className="truncate font-medium text-slate-100">{info.fileName}</p>
              <p className="mt-0.5 text-sm text-slate-400">
                {inputMode === 'video' ? (
                  <>
                    {info.width}×{info.height} · {formatDuration(info.durationSec)}
                    {files[0] ? ` · ${formatSize(files[0].size)}` : ''}
                  </>
                ) : (
                  <>
                    {files.length} image{files.length !== 1 ? 's' : ''} · ready for contact sheet
                  </>
                )}
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
            <p className="font-medium text-slate-100">Drop video or images, or click to browse</p>
            <p className="text-sm text-slate-400">Video: MP4 · MOV · WebM | Images: JPG · PNG · WebP (multi-select)</p>
          </>
        )}
      </div>

      {previewUrl && inputMode === 'video' && (
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
