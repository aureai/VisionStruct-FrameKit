/*
 * App.tsx
 * -----------------------------------------------------------------------------
 * Top-level UI shell for VisionStruct FrameKit. Wires the Dropzone, Controls,
 * ProgressBar, GifPreview and PreviewGrid to the useFrameKit pipeline hook, and
 * owns the editable settings state. Composition only — no processing logic
 * lives here.
 *
 * Last updated: 2026-07-28 — PixelFold design system, dark theme default.
 * -----------------------------------------------------------------------------
 */

import { useCallback, useEffect, useState } from 'react';
import { Download, Wand2 } from 'lucide-react';
import { Dropzone } from './components/Dropzone';
import { Controls } from './components/Controls';
import { ProgressBar } from './components/ProgressBar';
import { PreviewGrid } from './components/PreviewGrid';
import { GifPreview } from './components/GifPreview';
import { ManualPicker } from './components/ManualPicker';
import { useFrameKit } from './hooks/useFrameKit';
import { isVideo } from './lib/fileType';
import { DEFAULT_SETTINGS, type FrameKitSettings, type SavedFrame } from './types';

export default function App() {
  const { info, frames, sheets, progress, run, runFromImages, downloadZip } = useFrameKit();
  const [files, setFiles] = useState<File[]>([]);
  const [settings, setSettings] = useState<FrameKitSettings>(DEFAULT_SETTINGS);
  const [savedFrames, setSavedFrames] = useState<SavedFrame[]>([]);
  const [manualVideoUrl, setManualVideoUrl] = useState<string | null>(null);

  const busy = progress.phase === 'loading' || progress.phase === 'extracting' || progress.phase === 'composing' || progress.phase === 'packaging';
  const isVideoFile = files.length === 1 && isVideo(files[0]);
  const isManualMode = settings.extractionMode === 'manual';

  const onFiles = useCallback((f: File[]) => {
    setFiles(f);
    setSavedFrames([]);
  }, []);

  const patch = useCallback((p: Partial<FrameKitSettings>) => setSettings((s) => ({ ...s, ...p })), []);

  useEffect(() => {
    if (!isVideoFile || !isManualMode || !files[0]) {
      setManualVideoUrl(null);
      return;
    }
    const url = URL.createObjectURL(files[0]);
    setManualVideoUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [files, isVideoFile, isManualMode]);

  useEffect(() => {
    if (files.length > 0 && !isVideo(files[0])) {
      setSettings((s) => ({ ...s, sheetFrameCount: files.length }));
    }
  }, [files]);

  const onGenerate = useCallback(() => {
    if (files.length === 0) return;
    if (files.length === 1 && isVideo(files[0])) {
      const times = isManualMode ? savedFrames.map((f) => f.time) : undefined;
      run(files[0], settings, times);
    } else {
      runFromImages(files, settings);
    }
  }, [files, settings, savedFrames, isManualMode, run, runFromImages]);

  const onAddFrame = useCallback((time: number, thumbnailUrl: string) => {
    const id = typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `frame-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setSavedFrames((prev) => [...prev, { id, time, thumbnailUrl }]);
  }, []);

  const onUpdateFrame = useCallback((id: string, newTime: number, thumbnailUrl: string) => {
    setSavedFrames((prev) =>
      prev.map((f) => (f.id === id ? { ...f, time: newTime, thumbnailUrl } : f))
    );
  }, []);

  const onRemoveFrame = useCallback((id: string) => {
    setSavedFrames((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const canGenerate = files.length > 0 && (!isManualMode || savedFrames.length > 0);

  return (
    <div className="min-h-screen font-body text-paper">
      <div className="mx-auto max-w-[720px] px-5 py-10 sm:px-6 sm:py-12 animate-rise">
        <header className="mb-8">
          <p className="mb-3 inline-block rounded-full border border-leaf/25 bg-leaf/10 px-3 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.06em] text-leaf">
            100% in your browser · Nothing is uploaded
          </p>
          <h1 className="font-display text-[clamp(2.6rem,7vw,3.8rem)] font-bold leading-[0.95] tracking-[-0.03em] text-paper">
            FrameKit
          </h1>
          <p className="mt-3 max-w-[48ch] text-[1.08rem] leading-relaxed text-ink-soft">
            Turn short clips into <em className="not-italic font-semibold text-leaf">frame sequences</em> + a labeled contact sheet for AI analysis.
          </p>
          <ul className="mt-4 flex flex-wrap gap-1.5" aria-label="Capabilities">
            <li className="rounded-lg border border-edge bg-mist/80 px-2.5 py-1 text-[0.74rem] font-bold tracking-wide text-ink-soft">Even</li>
            <li className="rounded-lg border border-edge bg-mist/80 px-2.5 py-1 text-[0.74rem] font-bold tracking-wide text-ink-soft">Manual</li>
            <li className="rounded-lg border border-edge bg-mist/80 px-2.5 py-1 text-[0.74rem] font-bold tracking-wide text-ink-soft">Contact sheet</li>
            <li className="rounded-lg border border-gold/40 bg-gold/15 px-2.5 py-1 text-[0.74rem] font-bold tracking-wide text-gold">ZIP</li>
          </ul>
        </header>

        <section className="space-y-6 overflow-hidden rounded-panel border border-edge bg-panel p-5 shadow-elevated sm:p-6">
          <Dropzone info={info} files={files} disabled={busy} hideVideoPreview={isVideoFile && isManualMode} onFiles={onFiles} />

          {isVideoFile && isManualMode && manualVideoUrl && (
            <ManualPicker
              videoUrl={manualVideoUrl}
              savedFrames={savedFrames}
              disabled={busy}
              onAddFrame={onAddFrame}
              onUpdateFrame={onUpdateFrame}
              onRemoveFrame={onRemoveFrame}
            />
          )}

          <Controls settings={settings} disabled={busy} onChange={patch} />

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={onGenerate}
              disabled={!canGenerate || busy}
              className="inline-flex min-w-[160px] flex-1 items-center justify-center gap-2 rounded-full bg-paper px-5 py-3 text-[0.95rem] font-semibold text-ink transition hover:-translate-y-px hover:bg-white disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0"
            >
              <Wand2 className="h-4 w-4" />
              Generate
            </button>
            <button
              type="button"
              onClick={downloadZip}
              disabled={frames.length === 0 || busy}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-edge bg-transparent px-5 py-3 text-[0.95rem] font-semibold text-ink-soft transition hover:-translate-y-px hover:bg-paper/[0.06] hover:text-paper disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0"
            >
              <Download className="h-4 w-4" />
              Download ZIP
            </button>
          </div>

          <ProgressBar progress={progress} />
        </section>

        {frames.length > 0 && (
          <section className="mt-6 space-y-4 overflow-hidden rounded-panel border border-edge bg-panel p-5 shadow-elevated sm:p-6">
            <GifPreview frames={frames} />
          </section>
        )}

        <div className="mt-8">
          <PreviewGrid frames={frames} sheets={sheets} />
        </div>

        <footer className="mt-12 text-center text-xs text-ink-soft/80">
          Runs entirely in your browser — clips are never uploaded. MP4 · MOV · WebM supported.
        </footer>
      </div>
    </div>
  );
}
