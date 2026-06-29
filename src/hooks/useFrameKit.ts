/*
 * useFrameKit.ts
 * -----------------------------------------------------------------------------
 * Orchestration hook for the FrameKit pipeline. Owns the lifecycle of a loaded
 * clip: load -> extract frames -> compose contact sheets -> (on demand) package
 * a ZIP. Centralizes progress state and is responsible for revoking object URLs
 * to avoid memory leaks across re-runs.
 *
 * Last updated: 2026-06-29 — Initial creation.
 * -----------------------------------------------------------------------------
 */

import { useCallback, useRef, useState } from 'react';
import { extractFrames, loadVideo } from '../lib/extractFrames';
import { buildContactSheets } from '../lib/contactSheet';
import { buildAndDownloadZip } from '../lib/packageZip';
import type { CapturedFrame, ClipInfo, ContactSheet, FrameKitSettings, ProgressState } from '../types';

const IDLE: ProgressState = { phase: 'idle', current: 0, total: 0, message: '' };

export function useFrameKit() {
  const [info, setInfo] = useState<ClipInfo | null>(null);
  const [frames, setFrames] = useState<CapturedFrame[]>([]);
  const [sheets, setSheets] = useState<ContactSheet[]>([]);
  const [progress, setProgress] = useState<ProgressState>(IDLE);

  // Hold the most recent object URLs so we can revoke them on re-run/reset.
  const urlsRef = useRef<string[]>([]);

  const revokeAll = useCallback(() => {
    urlsRef.current.forEach((u) => URL.revokeObjectURL(u));
    urlsRef.current = [];
  }, []);

  const reset = useCallback(() => {
    revokeAll();
    setInfo(null);
    setFrames([]);
    setSheets([]);
    setProgress(IDLE);
  }, [revokeAll]);

  const run = useCallback(
    async (file: File, settings: FrameKitSettings) => {
      revokeAll();
      setFrames([]);
      setSheets([]);
      let videoUrl: string | null = null;

      try {
        setProgress({ phase: 'loading', current: 0, total: 0, message: 'Loading clip…' });
        const { video, url, info: clip } = await loadVideo(file);
        videoUrl = url;
        setInfo(clip);

        setProgress({ phase: 'extracting', current: 0, total: settings.sequenceCount, message: 'Extracting frames…' });
        const seqFrames = await extractFrames(video, clip.durationSec, {
          count: settings.sequenceCount,
          format: settings.format,
          jpegQuality: settings.jpegQuality,
          onProgress: (current, total) =>
            setProgress({ phase: 'extracting', current, total, message: `Extracting frame ${current}/${total}…` }),
        });

        // The contact sheet may use a different (typically larger) frame count.
        let sheetFrames = seqFrames;
        if (settings.sheetFrameCount !== settings.sequenceCount) {
          setProgress({ phase: 'extracting', current: 0, total: settings.sheetFrameCount, message: 'Sampling sheet frames…' });
          sheetFrames = await extractFrames(video, clip.durationSec, {
            count: settings.sheetFrameCount,
            format: 'jpeg',
            jpegQuality: 0.9,
            onProgress: (current, total) =>
              setProgress({ phase: 'extracting', current, total, message: `Sampling sheet frame ${current}/${total}…` }),
          });
        }

        setProgress({ phase: 'composing', current: 0, total: 0, message: 'Composing contact sheet…' });
        const builtSheets = await buildContactSheets(sheetFrames, {
          columns: settings.sheetColumns,
          tileMaxEdge: settings.tileMaxEdge,
          maxFramesPerSheet: settings.maxFramesPerSheet,
          clipName: clip.fileName,
          durationSec: clip.durationSec,
        });

        // Track URLs for cleanup. Sheet frames that aren't part of the sequence
        // were only needed for composition, so revoke their preview URLs now.
        urlsRef.current.push(...seqFrames.map((f) => f.url), ...builtSheets.map((s) => s.url));
        if (sheetFrames !== seqFrames) {
          sheetFrames.forEach((f) => URL.revokeObjectURL(f.url));
        }

        setFrames(seqFrames);
        setSheets(builtSheets);
        setProgress({ phase: 'done', current: seqFrames.length, total: seqFrames.length, message: 'Done' });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unexpected error during processing.';
        setProgress({ phase: 'error', current: 0, total: 0, message });
      } finally {
        if (videoUrl) URL.revokeObjectURL(videoUrl);
      }
    },
    [revokeAll],
  );

  const downloadZip = useCallback(async () => {
    if (!info || frames.length === 0) return;
    setProgress({ phase: 'packaging', current: 0, total: 0, message: 'Packaging ZIP…' });
    try {
      await buildAndDownloadZip(frames, sheets, info, frames[0].blob.type === 'image/jpeg' ? 'jpeg' : 'png');
      setProgress({ phase: 'done', current: frames.length, total: frames.length, message: 'Downloaded' });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to package ZIP.';
      setProgress({ phase: 'error', current: 0, total: 0, message });
    }
  }, [info, frames, sheets]);

  return { info, frames, sheets, progress, run, reset, downloadZip };
}
