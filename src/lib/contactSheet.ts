/*
 * contactSheet.ts
 * -----------------------------------------------------------------------------
 * Composes one or more labeled contact sheets from captured frames. Each cell is
 * downscaled to a tile (capped by `tileMaxEdge` so image models retain per-frame
 * detail rather than over-downsampling a huge sheet), and tagged with its frame
 * number and source timestamp. When the requested frame count exceeds
 * `maxFramesPerSheet`, output is split across multiple sheets.
 *
 * A header strip records the source filename, duration and frame count so the
 * sheet is self-describing when handed to an AI image model.
 *
 * Last updated: 2026-06-29 — Initial creation.
 * -----------------------------------------------------------------------------
 */

import type { CapturedFrame, ContactSheet } from '../types';

export interface ContactSheetOptions {
  columns: number;
  tileMaxEdge: number;
  maxFramesPerSheet: number;
  clipName: string;
  durationSec: number;
}

const PAD = 16; // outer/inner padding (px)
const LABEL_H = 26; // per-tile label bar height (px)
const HEADER_H = 44; // sheet header strip height (px)

/** Scale a source w/h so its longest edge is <= maxEdge. */
function fitTile(w: number, h: number, maxEdge: number): { w: number; h: number } {
  const longest = Math.max(w, h);
  if (longest <= maxEdge) return { w, h };
  const k = maxEdge / longest;
  return { w: Math.round(w * k), h: Math.round(h * k) };
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function sheetBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Failed to encode contact sheet.'))), 'image/png'),
  );
}

/** Render the full set of contact sheets for the given frames. */
export async function buildContactSheets(
  frames: CapturedFrame[],
  opts: ContactSheetOptions,
): Promise<ContactSheet[]> {
  if (frames.length === 0) return [];

  const tile = fitTile(frames[0].width, frames[0].height, opts.tileMaxEdge);
  const groups = chunk(frames, Math.max(1, opts.maxFramesPerSheet));
  const sheets: ContactSheet[] = [];

  for (let g = 0; g < groups.length; g++) {
    const group = groups[g];
    const cols = Math.max(1, Math.min(opts.columns, group.length));
    const rows = Math.ceil(group.length / cols);

    const cellW = tile.w;
    const cellH = tile.h + LABEL_H;
    const width = PAD + cols * (cellW + PAD);
    const height = HEADER_H + PAD + rows * (cellH + PAD);

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context unavailable.');

    // Background.
    ctx.fillStyle = '#0b0d12';
    ctx.fillRect(0, 0, width, height);

    // Header strip.
    const sheetLabel = groups.length > 1 ? ` — sheet ${g + 1}/${groups.length}` : '';
    ctx.fillStyle = '#5b8cff';
    ctx.font = '600 16px system-ui, -apple-system, sans-serif';
    ctx.textBaseline = 'middle';
    ctx.fillText(
      `${opts.clipName}  ·  ${opts.durationSec.toFixed(2)}s  ·  ${group.length} frames${sheetLabel}`,
      PAD,
      HEADER_H / 2 + 4,
    );

    // Decode all tiles in this group in parallel for speed.
    const bitmaps = await Promise.all(group.map((f) => createImageBitmap(f.blob)));

    for (let i = 0; i < group.length; i++) {
      const f = group[i];
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = PAD + col * (cellW + PAD);
      const y = HEADER_H + PAD + row * (cellH + PAD);

      // Tile image.
      ctx.drawImage(bitmaps[i], x, y, tile.w, tile.h);
      bitmaps[i].close();

      // Label bar.
      const ly = y + tile.h;
      ctx.fillStyle = '#13161d';
      ctx.fillRect(x, ly, tile.w, LABEL_H);
      ctx.fillStyle = '#e6e9f0';
      ctx.font = '600 13px system-ui, -apple-system, sans-serif';
      ctx.fillText(`Frame ${f.index}`, x + 8, ly + LABEL_H / 2);
      ctx.fillStyle = '#8a93a6';
      ctx.font = '12px system-ui, -apple-system, sans-serif';
      const ts = `t=${f.time.toFixed(2)}s`;
      const tsW = ctx.measureText(ts).width;
      ctx.fillText(ts, x + tile.w - tsW - 8, ly + LABEL_H / 2);
    }

    const blob = await sheetBlob(canvas);
    sheets.push({
      index: g + 1,
      blob,
      url: URL.createObjectURL(blob),
      width,
      height,
    });
  }

  return sheets;
}
