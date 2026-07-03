/*
 * App.tsx
 * -----------------------------------------------------------------------------
 * Top-level UI shell for VisionStruct FrameKit. Wires the Dropzone, Controls,
 * ProgressBar, GifPreview and PreviewGrid to the useFrameKit pipeline hook, and
 * owns the editable settings state. Composition only — no processing logic
 * lives here.
 *
 * Last updated: 2026-07-03 — Auto-set sheetFrameCount when images are loaded.
 * -----------------------------------------------------------------------------
 */

import { useCallback, useEffect, useState } from 'react';
import { Download, Sparkles, Wand2 } from 'lucide-react';
import { Dropzone } from './components/Dropzone';
import { Controls } from './components/Controls';
import { ProgressBar } from './components/ProgressBar';
import { PreviewGrid } from './components/PreviewGrid';
import { GifPreview } from './components/GifPreview';
import { useFrameKit } from './hooks/useFrameKit';
import { isVideo } from './lib/fileType';
import { DEFAULT_SETTINGS, type FrameKitSettings } from './types';

export default function App() {
  const { info, frames, sheets, progress, run, runFromImages, downloadZip } = useFrameKit();
  const [files, setFiles] = useState<File[]>([]);
  const [settings, setSettings] = useState<FrameKitSettings>(DEFAULT_SETTINGS);

  const busy = progress.phase === 'loading' || progress.phase === 'extracting' || progress.phase === 'composing' || progress.phase === 'packaging';

  const onFiles = useCallback((f: File[]) => setFiles(f), []);
  const patch = useCallback((p: Partial<FrameKitSettings>) => setSettings((s) => ({ ...s, ...p })), []);

  // Auto-set sheetFrameCount to match uploaded image count (image mode only)
  useEffect(() => {
    if (files.length > 0 && !isVideo(files[0])) {
      setSettings((s) => ({ ...s, sheetFrameCount: files.length }));
    }
  }, [files]);

  const onGenerate = useCallback(() => {
    if (files.length === 0) return;
    if (files.length === 1 && isVideo(files[0])) {
      run(files[0], settings);
    } else {
      runFromImages(files, settings);
    }
  }, [files, settings, run, runFromImages]);

  return (
    <div className="min-h-screen bg-ink text-slate-100">
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <header className="mb-8 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/15">
            <Sparkles className="h-5 w-5 text-accent" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">VisionStruct FrameKit</h1>
            <p className="text-sm text-slate-400">
              Turn short clips into frame sequences + a labeled contact sheet for AI analysis.
            </p>
          </div>
        </header>

        <div className="space-y-6 rounded-2xl border border-edge bg-panel p-5 sm:p-6">
          <Dropzone info={info} files={files} disabled={busy} onFiles={onFiles} />

          <Controls settings={settings} disabled={busy} onChange={patch} />

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={onGenerate}
              disabled={files.length === 0 || busy}
              className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Wand2 className="h-4 w-4" />
              Generate
            </button>
            <button
              onClick={downloadZip}
              disabled={frames.length === 0 || busy}
              className="inline-flex items-center gap-2 rounded-lg border border-edge px-4 py-2 text-sm font-medium text-slate-100 transition hover:border-accent/60 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Download className="h-4 w-4" />
              Download ZIP
            </button>
          </div>

          <ProgressBar progress={progress} />
        </div>

        {frames.length > 0 && (
          <div className="mt-6 rounded-2xl border border-edge bg-panel p-5 sm:p-6">
            <GifPreview frames={frames} />
          </div>
        )}

        <div className="mt-8">
          <PreviewGrid frames={frames} sheets={sheets} />
        </div>

        <footer className="mt-12 text-center text-xs text-slate-500">
          Runs entirely in your browser — clips are never uploaded. MP4 · MOV · WebM supported.
        </footer>
      </div>
    </div>
  );
}
