/*
 * ManualPicker.tsx
 * -----------------------------------------------------------------------------
 * Manual frame selection UI. Displays a scrubbable video player, allows users
 * to save frames at current timestamp or type specific seconds, and manages
 * a removable list of selected timestamps.
 *
 * Presentational only — parent owns selectedTimes state.
 *
 * Last updated: 2026-07-28 — Initial creation for dual-mode FrameKit.
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
  onUpdateFrame: (oldTime: number, newTime: number) => void;
  onRemoveFrame: (time: number) => void;
}

export function ManualPicker({ videoUrl, savedFrames, disabled, onAddFrame, onUpdateFrame, onRemoveFrame }: ManualPickerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [typedTime, setTypedTime] = useState('');
  const [editingTime, setEditingTime] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadedMetadata = () => {
      setDuration(video.duration);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
    };

    const handlePlay = () => setPlaying(true);
    const handlePause = () => setPlaying(false);

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
    };
  }, []);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (playing) {
      video.pause();
    } else {
      video.play();
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

    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    canvas.width = 160;
    canvas.height = (160 / video.videoWidth) * video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.8);
  };

  const handleSaveFrame = () => {
    if (disabled || savedFrames.length >= 40) return;
    const time = videoRef.current?.currentTime ?? 0;
    // Dedupe near-duplicates within 0.05s
    const isDupe = savedFrames.some((f) => Math.abs(f.time - time) < 0.05);
    if (!isDupe) {
      const thumbnailUrl = captureThumbnail();
      onAddFrame(time, thumbnailUrl);
    }
  };

  const handleAddTyped = async () => {
    if (disabled || savedFrames.length >= 40) return;
    const time = parseFloat(typedTime);
    if (isNaN(time) || time < 0 || time > duration) return;
    // Dedupe near-duplicates within 0.05s
    const isDupe = savedFrames.some((f) => Math.abs(f.time - time) < 0.05);
    if (!isDupe) {
      const video = videoRef.current;
      if (video) {
        const originalTime = video.currentTime;
        video.currentTime = time;
        await new Promise((resolve) => {
          video.addEventListener('seeked', resolve, { once: true });
        });
        const thumbnailUrl = captureThumbnail();
        video.currentTime = originalTime;
        onAddFrame(time, thumbnailUrl);
        setTypedTime('');
      }
    }
  };

  const startEdit = (time: number) => {
    setEditingTime(time);
    setEditValue(time.toFixed(3));
  };

  const saveEdit = (oldTime: number) => {
    const newTime = parseFloat(editValue);
    if (!isNaN(newTime) && newTime >= 0 && newTime <= duration && newTime !== oldTime) {
      // Check if new time is a dupe with another frame (excluding the one being edited)
      const isDupe = savedFrames.some((f) => f.time !== oldTime && Math.abs(f.time - newTime) < 0.05);
      if (!isDupe) {
        onUpdateFrame(oldTime, newTime);
      }
    }
    setEditingTime(null);
    setEditValue('');
  };

  const cancelEdit = () => {
    setEditingTime(null);
    setEditValue('');
  };

  const sortedFrames = [...savedFrames].sort((a, b) => a.time - b.time);

  return (
    <div className="space-y-4 rounded-xl border border-edge bg-panel-darker p-4">
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
            onClick={togglePlay}
            disabled={disabled}
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent text-white transition hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </button>

          <input
            type="range"
            min={0}
            max={duration}
            step={0.01}
            value={currentTime}
            onChange={handleSeek}
            disabled={disabled}
            className="flex-1 accent-accent"
          />

          <span className="font-mono text-sm text-slate-300">
            {currentTime.toFixed(3)}s / {duration.toFixed(3)}s
          </span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
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
            max={duration}
            disabled={disabled || savedFrames.length >= 40}
            className="w-24 rounded-lg border border-edge bg-ink px-3 py-2 text-sm text-slate-100 outline-none focus:border-accent disabled:cursor-not-allowed disabled:opacity-50"
          />
          <button
            onClick={handleAddTyped}
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
                key={frame.time}
                className="group relative overflow-hidden rounded-lg border border-edge bg-panel transition hover:border-accent/50"
              >
                <img
                  src={frame.thumbnailUrl}
                  alt={`Frame at ${frame.time.toFixed(3)}s`}
                  className="w-full object-cover"
                />
                <div className="flex items-center justify-between gap-2 p-2">
                  {editingTime === frame.time ? (
                    <div className="flex flex-1 items-center gap-1">
                      <input
                        type="number"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        step={0.001}
                        min={0}
                        max={duration}
                        className="w-full rounded border border-edge bg-ink px-2 py-1 text-xs font-mono text-slate-100 outline-none focus:border-accent"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveEdit(frame.time);
                          if (e.key === 'Escape') cancelEdit();
                        }}
                      />
                      <button
                        onClick={() => saveEdit(frame.time)}
                        className="text-green-400 transition hover:text-green-300"
                      >
                        <Check className="h-3 w-3" />
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="text-slate-400 transition hover:text-slate-100"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <span className="flex-1 truncate font-mono text-xs text-slate-100">
                        {frame.time.toFixed(3)}s
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => startEdit(frame.time)}
                          disabled={disabled}
                          className="text-slate-400 opacity-0 transition hover:text-accent group-hover:opacity-100 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <Edit2 className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => onRemoveFrame(frame.time)}
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
