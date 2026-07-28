/*
 * ManualPicker.tsx
 * -----------------------------------------------------------------------------
 * Manual frame selection UI. Displays a scrubbable video player, allows users
 * to save frames at current timestamp or type specific seconds, and manages
 * a removable list of selected timestamps with thumbnail previews.
 *
 * Presentational only — parent owns savedFrames state.
 *
 * Last updated: 2026-07-28 — Previews, edit, keyboard nav; fix seek/thumbnail bugs.
 * -----------------------------------------------------------------------------
 */

import { useEffect, useRef, useState } from 'react';
import { Play, Pause, Plus, X, Edit2, Check } from 'lucide-react';
import type { SavedFrame } from '../types';

interface ManualPickerProps {
  videoUrl: string;
  savedFrames: SavedFrame[];
  disabled?: boolean;
  onAddFrame: (time: number, thumbnailUrl: string) => void;
  onUpdateFrame: (id: string, newTime: number, thumbnailUrl: string) => void;
  onRemoveFrame: (id: string) => void;
}

export function ManualPicker({ videoUrl, savedFrames, disabled, onAddFrame, onUpdateFrame, onRemoveFrame }: ManualPickerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [typedTime, setTypedTime] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [editError, setEditError] = useState<string | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadedMetadata = () => {
      setDuration(video.duration);
      setCurrentTime(video.currentTime);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
    };

    const handleSeeked = () => {
      setCurrentTime(video.currentTime);
    };

    const handlePlay = () => setPlaying(true);
    const handlePause = () => setPlaying(false);

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('seeked', handleSeeked);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);

    // Metadata may already be available if the browser cached the blob.
    if (video.readyState >= 1 && isFinite(video.duration) && video.duration > 0) {
      setDuration(video.duration);
      setCurrentTime(video.currentTime);
    }

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('seeked', handleSeeked);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
    };
  }, [videoUrl]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || disabled) return;

    const seekBy = (delta: number) => {
      const next = Math.min(Math.max(video.currentTime + delta, 0), video.duration || 0);
      video.currentTime = next;
      setCurrentTime(next);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't interfere if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          seekBy(-0.033);
          break;
        case 'ArrowRight':
          e.preventDefault();
          seekBy(0.033);
          break;
        case 'ArrowUp':
          e.preventDefault();
          seekBy(1);
          break;
        case 'ArrowDown':
          e.preventDefault();
          seekBy(-1);
          break;
        case ' ':
          e.preventDefault();
          if (video.paused) {
            void video.play();
          } else {
            video.pause();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [disabled, videoUrl]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (playing) {
      video.pause();
    } else {
      void video.play();
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;
    const time = Number(e.target.value);
    video.currentTime = time;
    setCurrentTime(time);
  };

  const captureThumbnail = (): string => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return '';
    if (!video.videoWidth || !video.videoHeight) return '';

    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    canvas.width = 160;
    canvas.height = Math.round((160 / video.videoWidth) * video.videoHeight);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.8);
  };

  const seekAndCapture = async (time: number): Promise<string> => {
    const video = videoRef.current;
    if (!video) return '';

    const originalTime = video.currentTime;
    const wasPlaying = !video.paused;
    if (wasPlaying) video.pause();

    await new Promise<void>((resolve, reject) => {
      const onSeeked = () => {
        cleanup();
        resolve();
      };
      const onError = () => {
        cleanup();
        reject(new Error('Seek failed'));
      };
      const timer = window.setTimeout(() => {
        cleanup();
        resolve(); // best-effort fallback
      }, 2000);
      const cleanup = () => {
        window.clearTimeout(timer);
        video.removeEventListener('seeked', onSeeked);
        video.removeEventListener('error', onError);
      };
      video.addEventListener('seeked', onSeeked, { once: true });
      video.addEventListener('error', onError, { once: true });
      try {
        video.currentTime = time;
      } catch {
        cleanup();
        reject(new Error('Unable to seek'));
      }
    });

    const thumbnailUrl = captureThumbnail();
    video.currentTime = originalTime;
    setCurrentTime(originalTime);
    return thumbnailUrl;
  };

  const handleSaveFrame = () => {
    if (disabled || savedFrames.length >= 40) return;
    const time = videoRef.current?.currentTime ?? 0;
    const isDupe = savedFrames.some((f) => Math.abs(f.time - time) < 0.05);
    if (!isDupe) {
      const thumbnailUrl = captureThumbnail();
      if (!thumbnailUrl) return;
      onAddFrame(time, thumbnailUrl);
    }
  };

  const handleAddTyped = async () => {
    if (disabled || savedFrames.length >= 40) return;
    const time = parseFloat(typedTime);
    if (isNaN(time) || time < 0 || time > duration) return;
    const isDupe = savedFrames.some((f) => Math.abs(f.time - time) < 0.05);
    if (isDupe) return;

    try {
      const thumbnailUrl = await seekAndCapture(time);
      if (!thumbnailUrl) return;
      onAddFrame(time, thumbnailUrl);
      setTypedTime('');
    } catch {
      // ignore seek failures; user can retry
    }
  };

  const startEdit = (frame: SavedFrame) => {
    setEditingId(frame.id);
    setEditValue(frame.time.toFixed(3));
    setEditError(null);
  };

  const saveEdit = async (frame: SavedFrame) => {
    const newTime = parseFloat(editValue);
    if (isNaN(newTime) || newTime < 0 || newTime > duration) {
      setEditError('Out of range');
      return;
    }
    if (Math.abs(newTime - frame.time) < 0.0005) {
      setEditingId(null);
      setEditValue('');
      setEditError(null);
      return;
    }
    const isDupe = savedFrames.some((f) => f.id !== frame.id && Math.abs(f.time - newTime) < 0.05);
    if (isDupe) {
      setEditError('Too close to another frame');
      return;
    }

    try {
      const thumbnailUrl = await seekAndCapture(newTime);
      if (!thumbnailUrl) {
        setEditError('Could not capture frame');
        return;
      }
      onUpdateFrame(frame.id, newTime, thumbnailUrl);
      setEditingId(null);
      setEditValue('');
      setEditError(null);
    } catch {
      setEditError('Seek failed');
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditValue('');
    setEditError(null);
  };

  const sortedFrames = [...savedFrames].sort((a, b) => a.time - b.time);

  return (
    <div className="space-y-4 rounded-xl border border-edge bg-ink/40 p-4">
      <canvas ref={canvasRef} className="hidden" />
      <div className="space-y-3">
        <video
          ref={videoRef}
          src={videoUrl}
          className="w-full rounded-lg bg-black"
          playsInline
          muted
        />

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={togglePlay}
            disabled={disabled}
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent text-white transition hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </button>

          <input
            type="range"
            min={0}
            max={duration || 0}
            step={0.01}
            value={currentTime}
            onChange={handleSeek}
            disabled={disabled || duration <= 0}
            className="flex-1 accent-accent"
          />

          <span className="font-mono text-sm text-slate-300">
            {currentTime.toFixed(3)}s / {duration.toFixed(3)}s
          </span>
        </div>

        <p className="text-xs text-slate-500">
          Keys: ←/→ frame · ↑/↓ 1s · Space play/pause
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={handleSaveFrame}
          disabled={disabled || savedFrames.length >= 40}
          className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
          Save frame
        </button>

        <div className="flex items-center gap-2">
          <input
            type="number"
            value={typedTime}
            onChange={(e) => setTypedTime(e.target.value)}
            placeholder="0.000"
            step={0.001}
            min={0}
            max={duration || undefined}
            disabled={disabled || savedFrames.length >= 40}
            className="w-24 rounded-lg border border-edge bg-ink px-3 py-2 text-sm text-slate-100 outline-none focus:border-accent disabled:cursor-not-allowed disabled:opacity-50"
          />
          <button
            type="button"
            onClick={() => void handleAddTyped()}
            disabled={disabled || savedFrames.length >= 40 || !typedTime}
            className="inline-flex items-center gap-1 rounded-lg border border-edge px-3 py-2 text-sm font-medium text-slate-100 transition hover:border-accent/60 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus className="h-3 w-3" />
            Add
          </button>
        </div>

        <span className="ml-auto text-xs text-slate-400">
          {savedFrames.length} / 40 frames
        </span>
      </div>

      {sortedFrames.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-slate-300">Selected frames ({sortedFrames.length})</h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {sortedFrames.map((frame) => (
              <div
                key={frame.id}
                className="group relative overflow-hidden rounded-lg border border-edge bg-panel transition hover:border-accent/50"
              >
                {frame.thumbnailUrl ? (
                  <img
                    src={frame.thumbnailUrl}
                    alt={`Frame at ${frame.time.toFixed(3)}s`}
                    className="aspect-video w-full object-cover"
                  />
                ) : (
                  <div className="flex aspect-video w-full items-center justify-center bg-ink text-xs text-slate-500">
                    No preview
                  </div>
                )}
                <div className="flex items-center justify-between gap-2 p-2">
                  {editingId === frame.id ? (
                    <div className="flex w-full flex-col gap-1">
                      <div className="flex flex-1 items-center gap-1">
                        <input
                          type="number"
                          value={editValue}
                          onChange={(e) => {
                            setEditValue(e.target.value);
                            setEditError(null);
                          }}
                          step={0.001}
                          min={0}
                          max={duration || undefined}
                          className="w-full rounded border border-edge bg-ink px-2 py-1 text-xs font-mono text-slate-100 outline-none focus:border-accent"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') void saveEdit(frame);
                            if (e.key === 'Escape') cancelEdit();
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => void saveEdit(frame)}
                          className="text-green-400 transition hover:text-green-300"
                        >
                          <Check className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          onClick={cancelEdit}
                          className="text-slate-400 transition hover:text-slate-100"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                      {editError && <span className="text-[10px] text-red-400">{editError}</span>}
                    </div>
                  ) : (
                    <>
                      <span className="flex-1 truncate font-mono text-xs text-slate-100">
                        {frame.time.toFixed(3)}s
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => startEdit(frame)}
                          disabled={disabled}
                          className="text-slate-400 opacity-0 transition hover:text-accent group-hover:opacity-100 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <Edit2 className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onRemoveFrame(frame.id)}
                          disabled={disabled}
                          className="text-slate-400 opacity-0 transition hover:text-red-400 group-hover:opacity-100 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
