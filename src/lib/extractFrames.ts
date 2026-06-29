/*
 * extractFrames.ts
 * -----------------------------------------------------------------------------
 * Core frame-extraction engine. Loads a video File entirely in the browser,
 * seeks to evenly-spaced timestamps across the clip's duration, and captures
 * each frame to a canvas at the source's native resolution.
 *
 * Strategy:
 *  - Frames are sampled at the CENTER of N equal time-slices, which avoids the
 *    common black/garbage first/last frame and yields visually even motion.
 *  - Where supported, `requestVideoFrameCallback` is used for frame-accurate
 *    captures; otherwise we fall back to the `seeked` event.
 *  - Capture is at native resolution; downscaling is the contact sheet's job.
 *
 * Codec note: relies on the browser's native <video> decoder. MP4/H.264 and
 * WebM are universally supported. MOV (H.264) works in most browsers; MOV
 * with HEVC/ProRes may fail on non-Safari browsers — the error message guides
 * users to re-export if needed.
 *
 * Last updated: 2026-06-29 — Fix: remove crossOrigin (taints canvas on blob
 *   URLs), cap capture resolution at 1920px max edge, add toDataURL fallback.
 * -----------------------------------------------------------------------------
 */

import type { CapturedFrame, ClipInfo, ImageFormat } from '../types';

/** Load a video File and resolve once metadata (duration/dimensions) is known. */
export function loadVideo(file: File): Promise<{ video: HTMLVideoElement; url: string; info: ClipInfo }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.preload = 'auto';
    video.muted = true;
    video.playsInline = true;
    // Do NOT set crossOrigin — blob URLs are same-origin and setting it can
    // taint the canvas in some browsers, causing toBlob to return null.
    video.src = url;

    const onError = () =>
      reject(
        new Error(
          'This video could not be decoded by the browser. Common cause: MOV/HEVC/ProRes. Try an MP4 (H.264) or WebM export.',
        ),
      );

    video.addEventListener('error', onError, { once: true });

    const onLoadedData = () => {
      if (!isFinite(video.duration) || video.duration <= 0) {
        reject(new Error('Could not read a valid duration from this clip.'));
        return;
      }
      if (video.videoWidth === 0 || video.videoHeight === 0) {
        reject(
          new Error(
            'This video\'s codec is not supported by your browser. MOV files with HEVC or ProRes only work in Safari. Try re-exporting as MP4 (H.264) or WebM, or open this page in Safari.',
          ),
        );
        return;
      }
      resolve({
        video,
        url,
        info: {
          fileName: file.name,
          durationSec: video.duration,
          width: video.videoWidth,
          height: video.videoHeight,
        },
      });
    };

    // loadeddata fires when the first frame has been decoded and is renderable.
    // loadedmetadata only reads the container — videoWidth/Height may still be 0
    // for unsupported codecs (e.g. HEVC MOV in Chrome).
    video.addEventListener('loadeddata', onLoadedData, { once: true });
  });
}

/** Compute center-of-slice timestamps for an N-frame even sample. */
export function computeTimestamps(durationSec: number, count: number): number[] {
  const n = Math.max(1, Math.floor(count));
  const slice = durationSec / n;
  return Array.from({ length: n }, (_, i) => {
    const t = (i + 0.5) * slice;
    // Clamp slightly inside the bounds to avoid decoder edge artifacts.
    return Math.min(Math.max(t, 0.001), Math.max(durationSec - 0.001, 0));
  });
}

/** Seek the video to a timestamp and resolve when the frame is ready to paint.
 *
 * Note: requestVideoFrameCallback is intentionally NOT used here. It requires
 * a video element attached to a rendering context to fire, and hangs silently
 * on detached/headless elements. The `seeked` event is sufficient for
 * ctx.drawImage() to read the correct decoded frame.
 */
function seekTo(video: HTMLVideoElement, time: number): Promise<void> {
  return new Promise((resolve, reject) => {
    video.addEventListener('seeked', () => resolve(), { once: true });
    video.addEventListener('error', () => reject(new Error('Seek failed during extraction.')), {
      once: true,
    });
    try {
      video.currentTime = time;
    } catch {
      reject(new Error('Unable to seek this clip.'));
    }
  });
}

function mimeFor(format: ImageFormat): string {
  return format === 'jpeg' ? 'image/jpeg' : 'image/png';
}

/** Max edge for capture — prevents memory exhaustion on 4K+ sources. */
const MAX_CAPTURE_EDGE = 1920;

function canvasToBlob(canvas: HTMLCanvasElement, format: ImageFormat, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
          return;
        }
        // Fallback: toDataURL → Blob conversion (works even when toBlob fails)
        try {
          const dataUrl = canvas.toDataURL(mimeFor(format), format === 'jpeg' ? quality : undefined);
          const byteString = atob(dataUrl.split(',')[1]);
          const arr = new Uint8Array(byteString.length);
          for (let i = 0; i < byteString.length; i++) arr[i] = byteString.charCodeAt(i);
          resolve(new Blob([arr], { type: mimeFor(format) }));
        } catch {
          reject(new Error('Failed to encode frame. The video may use an unsupported codec or the browser cannot allocate memory for this resolution.'));
        }
      },
      mimeFor(format),
      format === 'jpeg' ? quality : undefined,
    );
  });
}

export interface ExtractOptions {
  count: number;
  format: ImageFormat;
  jpegQuality: number;
  onProgress?: (current: number, total: number) => void;
}

/**
 * Extract `count` evenly-spaced frames from a loaded video at native resolution.
 * Returns CapturedFrame objects with preview object URLs (caller revokes them).
 */
export async function extractFrames(
  video: HTMLVideoElement,
  durationSec: number,
  options: ExtractOptions,
): Promise<CapturedFrame[]> {
  const { count, format, jpegQuality, onProgress } = options;
  const timestamps = computeTimestamps(durationSec, count);

  const canvas = document.createElement('canvas');
  // Cap capture resolution to prevent memory exhaustion on high-res sources.
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  if (vw === 0 || vh === 0) throw new Error('Video has no decodable dimensions — codec may be unsupported.');
  const scale = Math.min(1, MAX_CAPTURE_EDGE / Math.max(vw, vh));
  canvas.width = Math.round(vw * scale);
  canvas.height = Math.round(vh * scale);
  const ctx = canvas.getContext('2d', { willReadFrequently: false });
  if (!ctx) throw new Error('Canvas 2D context unavailable in this browser.');

  const frames: CapturedFrame[] = [];

  for (let i = 0; i < timestamps.length; i++) {
    const time = timestamps[i];
    await seekTo(video, time);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const blob = await canvasToBlob(canvas, format, jpegQuality);
    frames.push({
      index: i + 1,
      time,
      blob,
      url: URL.createObjectURL(blob),
      width: canvas.width,
      height: canvas.height,
    });
    onProgress?.(i + 1, timestamps.length);
  }

  return frames;
}
