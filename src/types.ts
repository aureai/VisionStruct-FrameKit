/*
 * types.ts
 * -----------------------------------------------------------------------------
 * Shared type definitions for VisionStruct FrameKit.
 *
 * Last updated: 2026-06-29 — Initial creation. Defines the data contracts shared
 * across the extraction engine, contact-sheet generator, and packaging layer.
 * -----------------------------------------------------------------------------
 */

/** Output image encoding for extracted frames and contact sheets. */
export type ImageFormat = 'png' | 'jpeg';

/** A single frame captured from the source video at native resolution. */
export interface CapturedFrame {
  /** 1-based frame index in the sampled sequence. */
  index: number;
  /** Timestamp (seconds) in the source video this frame was sampled from. */
  time: number;
  /** Encoded image blob at the source's native resolution. */
  blob: Blob;
  /** Object URL for in-app preview (must be revoked by the owner). */
  url: string;
  /** Native pixel width of the captured frame. */
  width: number;
  /** Native pixel height of the captured frame. */
  height: number;
}

/** Metadata describing the loaded source clip. */
export interface ClipInfo {
  fileName: string;
  durationSec: number;
  width: number;
  height: number;
}

/** User-tunable settings that drive extraction and sheet generation. */
export interface FrameKitSettings {
  /** Number of frames in the motion sequence (1–15). */
  sequenceCount: number;
  /** Number of frames packed into the contact sheet(s). */
  sheetFrameCount: number;
  /** Columns in the contact-sheet grid. */
  sheetColumns: number;
  /** Longest-edge cap (px) for each contact-sheet tile (detail vs. size guard). */
  tileMaxEdge: number;
  /** Maximum total frames per sheet before splitting into multiple sheets. */
  maxFramesPerSheet: number;
  /** Output encoding for the frame sequence. */
  format: ImageFormat;
  /** JPEG quality 0–1 (ignored for PNG). */
  jpegQuality: number;
}

/** A rendered contact sheet ready for preview/packaging. */
export interface ContactSheet {
  /** 1-based sheet index (for multi-sheet output). */
  index: number;
  blob: Blob;
  url: string;
  width: number;
  height: number;
}

/** Coarse progress reporting for the UI. */
export interface ProgressState {
  phase: 'idle' | 'loading' | 'extracting' | 'composing' | 'packaging' | 'done' | 'error';
  current: number;
  total: number;
  message: string;
}

export const DEFAULT_SETTINGS: FrameKitSettings = {
  sequenceCount: 12,
  sheetFrameCount: 16,
  sheetColumns: 4,
  tileMaxEdge: 512,
  maxFramesPerSheet: 20,
  format: 'png',
  jpegQuality: 0.92,
};
