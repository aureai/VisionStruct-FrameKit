/*
 * loadImages.ts
 * -----------------------------------------------------------------------------
 * Loads an array of image Files and converts them to CapturedFrame objects.
 * This allows the app to accept pre-extracted frames (user-supplied images)
 * as an alternative to video extraction.
 *
 * Each image is loaded to read dimensions, then converted to a Blob + object
 * URL for preview. The timestamp is synthetic (evenly spaced 0.5s intervals).
 *
 * Last updated: 2026-07-03 — Initial creation.
 * -----------------------------------------------------------------------------
 */

import type { CapturedFrame } from '../types';

function loadImage(file: File): Promise<{ img: HTMLImageElement; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ img, width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`Failed to load image: ${file.name}`));
    };
    img.src = url;
  });
}

/**
 * Load an array of image Files and convert to CapturedFrame objects.
 * Timestamps are synthetic: evenly spaced at 0.5s intervals.
 */
export async function loadImagesAsFrames(files: File[]): Promise<CapturedFrame[]> {
  if (files.length === 0) throw new Error('No images provided.');

  const frames: CapturedFrame[] = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    if (!file.type.startsWith('image/')) {
      throw new Error(`File ${file.name} is not an image.`);
    }

    const { width, height } = await loadImage(file);
    const url = URL.createObjectURL(file);

    frames.push({
      index: i + 1,
      time: i * 0.5, // Synthetic timestamp: 0s, 0.5s, 1.0s, ...
      blob: file,
      url,
      width,
      height,
    });
  }

  return frames;
}
