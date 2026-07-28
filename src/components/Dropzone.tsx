/*
 * Dropzone.tsx
 * -----------------------------------------------------------------------------
 * Drag-and-drop / click-to-browse surface for selecting video (single) or
 * images (multiple). Surfaces the chosen File(s) to its parent and renders
 * the appropriate preview (video player or image count badge).
 *
 * Last updated: 2026-07-28 — PixelFold dark theme.
 * -----------------------------------------------------------------------------
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { CheckCircle2, RefreshCw } from 'lucide-react';
import { isImage, isVideo } from '../lib/fileType';
import type { ClipInfo } from '../types';

const ACCEPTED = 'video/mp4,video/webm,video/quicktime,video/mov,video/*,image/jpeg,image/png,image/webp';

interface DropzoneProps {
  info: ClipInfo | null;
  files: File[];
  disabled?: boolean;
  hideVideoPreview?: boolean;
  onFiles: (files: File[]) => void;
}

export function Dropzone({ info, files, disabled, hideVideoPreview, onFiles }: DropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [dragging, setDragging] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [inputMode, setInputMode] = useState<'video' | 'images'>('video');
  // Read directly from the file so the summary is available immediately —
  // `info` only populates after Generate runs the extraction pipeline.
  const [localVideoMeta, setLocalVideoMeta] = useState<{ width: number; height: number; durationSec: number } | null>(null);

  useEffect(() => {
    if (files.length === 0) {
      setPreviewUrl(null);
      setLocalVideoMeta(null);
      return;
    }
    if (files.length === 1 && files[0].type.startsWith('video/')) {
      const url = URL.createObjectURL(files[0]);
      setPreviewUrl(url);
      setInputMode('video');
      setLocalVideoMeta(null);
      return () => URL.revokeObjectURL(url);
    }
    setPreviewUrl(null);
    setLocalVideoMeta(null);
    setInputMode('images');
  }, [files]);

  const hasFile = files.length > 0;
  const summary = info ?? (localVideoMeta ? { ...localVideoMeta, fileName: files[0]?.name ?? '' } : null);

  const handleFiles = useCallback(
    (fileList: FileList | null) => {
      if (!fileList || fileList.length === 0) return;
      const arr = Array.from(fileList);
      const videos = arr.filter(isVideo);
      const images = arr.filter(isImage);
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
      {previewUrl && inputMode === 'video' && !hideVideoPreview && (
        <video
          ref={videoRef}
          src={previewUrl}
          controls
          muted
          playsInline
          onLoadedMetadata={(e) => {
            const v = e.currentTarget;
            if (isFinite(v.duration) && v.duration > 0) {
              setLocalVideoMeta({ width: v.videoWidth, height: v.videoHeight, durationSec: v.duration });
            }
          }}
          className="w-full rounded-2xl border border-edge bg-black object-contain"
          style={{ maxHeight: '280px' }}
        />
      )}

      <div
        role="button"
        tabIndex={0}
        onClick={() => !disabled && inputRef.current?.click()}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && !disabled && inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); if (!disabled) setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); if (!disabled) handleFiles(e.dataTransfer.files); }}
        className={[
          'relative flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed text-center transition',
          hasFile ? 'px-4 py-2.5' : 'min-h-[220px] px-6 py-8',
          disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
          dragging
            ? 'border-leaf/45 bg-leaf/[0.08]'
            : hasFile
              ? 'border-leaf/35 bg-leaf/[0.06] hover:border-leaf/50'
              : 'border-transparent bg-[linear-gradient(180deg,rgba(238,245,241,0.04),transparent)] hover:border-leaf/35 hover:bg-leaf/[0.06]',
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
        {hasFile ? (
          <div className="flex w-full items-center gap-3 text-left">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-leaf" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-paper">{summary?.fileName ?? files[0]?.name}</p>
              <p className="text-xs text-ink-soft">
                {inputMode === 'video' ? (
                  summary ? (
                    <>
                      {summary.width}×{summary.height} · {formatDuration(summary.durationSec)}
                      {files[0] ? ` · ${formatSize(files[0].size)}` : ''}
                    </>
                  ) : (
                    'Loading…'
                  )
                ) : (
                  <>
                    {files.length} image{files.length !== 1 ? 's' : ''} · ready for contact sheet
                  </>
                )}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1.5 rounded-full border border-edge bg-mist px-2.5 py-1 text-xs font-semibold text-ink-soft transition hover:border-leaf/40 hover:text-paper">
              <RefreshCw className="h-3 w-3" />
              Replace
            </div>
          </div>
        ) : (
          <>
            <div className="animate-bob mb-1 grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-leaf to-leaf-deep text-ink shadow-sm">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-7 w-7">
                <path d="M12 16V4m0 0l-4 4m4-4l4 4" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M4 14v4a2 2 0 002 2h12a2 2 0 002-2v-4" strokeLinecap="round" />
              </svg>
            </div>
            <p className="text-[1.15rem] font-semibold text-paper">Drop video or images here</p>
            <p className="text-[0.95rem] text-ink-soft">
              or <span className="text-leaf underline underline-offset-[3px]">browse</span>
              {' '}· MP4 · MOV · WebM · JPG · PNG · WebP
            </p>
          </>
        )}
      </div>
    </div>
  );
}
