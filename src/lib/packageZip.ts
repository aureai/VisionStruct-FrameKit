/*
 * packageZip.ts
 * -----------------------------------------------------------------------------
 * Bundles the extracted frame sequence and contact sheet(s) into a single ZIP
 * with two subfolders (`frames/` and `contact-sheet/`) plus a `manifest.txt`
 * describing the source clip and sampled timestamps. Triggers a browser
 * download. This two-folder layout mirrors the requested output structure while
 * staying compatible with every browser (no File System Access API required).
 *
 * Last updated: 2026-06-29 — Initial creation.
 * -----------------------------------------------------------------------------
 */

import JSZip from 'jszip';
import type { CapturedFrame, ClipInfo, ContactSheet, ImageFormat } from '../types';

function pad2(n: number): string {
  return n.toString().padStart(2, '0');
}

/** Strip the extension and sanitize a filename for use as a base name. */
function baseName(fileName: string): string {
  return fileName.replace(/\.[^/.]+$/, '').replace(/[^\w-]+/g, '_').slice(0, 60) || 'clip';
}

function triggerDownload(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Give the download a tick to start before revoking.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function buildAndDownloadZip(
  frames: CapturedFrame[],
  sheets: ContactSheet[],
  info: ClipInfo,
  format: ImageFormat,
): Promise<void> {
  const zip = new JSZip();
  const base = baseName(info.fileName);
  const ext = format === 'jpeg' ? 'jpg' : 'png';

  const framesDir = zip.folder('frames');
  const sheetDir = zip.folder('contact-sheet');
  if (!framesDir || !sheetDir) throw new Error('Failed to create ZIP folders.');

  for (const f of frames) {
    framesDir.file(`frame_${pad2(f.index)}_t${f.time.toFixed(2)}s.${ext}`, f.blob);
  }

  for (const s of sheets) {
    const suffix = sheets.length > 1 ? `_${pad2(s.index)}` : '';
    sheetDir.file(`contact_sheet${suffix}.png`, s.blob);
  }

  const manifest = [
    'VisionStruct FrameKit — output manifest',
    '========================================',
    `Source file : ${info.fileName}`,
    `Duration    : ${info.durationSec.toFixed(3)} s`,
    `Resolution  : ${info.width}x${info.height}`,
    `Frames      : ${frames.length}`,
    `Sheets      : ${sheets.length}`,
    '',
    'Sampled timestamps:',
    ...frames.map((f) => `  Frame ${pad2(f.index)} -> t=${f.time.toFixed(3)}s`),
    '',
    'frames/        : sequential frames to convey micro-movement (Dense Frame Mode).',
    'contact-sheet/ : labeled grid image(s) for single-image model analysis.',
  ].join('\n');
  zip.file('manifest.txt', manifest);

  const blob = await zip.generateAsync({ type: 'blob' });
  triggerDownload(blob, `${base}_visionstruct.zip`);
}
