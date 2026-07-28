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
import { Play, Pause, Plus, X } from 'lucide-react';

interface ManualPickerProps {
  videoUrl: string;
  selectedTimes: number[];
  disabled?: boolean;
  onAddTime: (time: number) => void;
  onRemoveTime: (time: number) => void;
}

export function ManualPicker({ videoUrl, selectedTimes, disabled, onAddTime, onRemoveTime }: ManualPickerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [typedTime, setTypedTime] = useState('');

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

  const handleSaveFrame = () => {
    if (disabled || selectedTimes.length >= 40) return;
    const time = videoRef.current?.currentTime ?? 0;
    // Dedupe near-duplicates within 0.05s
    const isDupe = selectedTimes.some((t) => Math.abs(t - time) < 0.05);
    if (!isDupe) {
      onAddTime(time);
    }
  };

  const handleAddTyped = () => {
    if (disabled || selectedTimes.length >= 40) return;
    const time = parseFloat(typedTime);
    if (isNaN(time) || time < 0 || time > duration) return;
    // Dedupe near-duplicates within 0.05s
    const isDupe = selectedTimes.some((t) => Math.abs(t - time) < 0.05);
    if (!isDupe) {
      onAddTime(time);
      setTypedTime('');
    }
  };

  const sortedTimes = [...selectedTimes].sort((a, b) => a - b);

  return (
    <div className="space-y-4 rounded-xl border border-edge bg-panel-darker p-4">
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
          disabled={disabled || selectedTimes.length >= 40}
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
            disabled={disabled || selectedTimes.length >= 40}
            className="w-24 rounded-lg border border-edge bg-ink px-3 py-2 text-sm text-slate-100 outline-none focus:border-accent disabled:cursor-not-allowed disabled:opacity-50"
          />
          <button
            onClick={handleAddTyped}
            disabled={disabled || selectedTimes.length >= 40 || !typedTime}
            className="inline-flex items-center gap-1 rounded-lg border border-edge px-3 py-2 text-sm font-medium text-slate-100 transition hover:border-accent/60 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus className="h-3 w-3" />
            Add
          </button>
        </div>

        <span className="ml-auto text-xs text-slate-400">
          {selectedTimes.length} / 40 frames
        </span>
      </div>

      {sortedTimes.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-slate-300">Selected frames</h3>
          <div className="flex flex-wrap gap-2">
            {sortedTimes.map((time) => (
              <div
                key={time}
                className="inline-flex items-center gap-2 rounded-lg border border-edge bg-panel px-3 py-1.5 text-sm"
              >
                <span className="font-mono text-slate-100">{time.toFixed(3)}s</span>
                <button
                  onClick={() => onRemoveTime(time)}
                  disabled={disabled}
                  className="text-slate-400 transition hover:text-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
