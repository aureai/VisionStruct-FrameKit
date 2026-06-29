/*
 * GifPreview.tsx
 * -----------------------------------------------------------------------------
 * Animates the extracted frame sequence as a looping canvas preview — visually
 * equivalent to a GIF. Renders immediately from the CapturedFrame object URLs
 * already in memory, so there is zero re-extraction cost on slider change.
 *
 * The animation fps is fixed at 4fps for short sequences and scales up slightly
 * for larger frame counts to keep the loop duration reasonable.
 *
 * Last updated: 2026-06-29 — Initial creation.
 * -----------------------------------------------------------------------------
 */

import { useEffect, useRef } from 'react';
import type { CapturedFrame } from '../types';

interface GifPreviewProps {
  frames: CapturedFrame[];
}

export function GifPreview({ frames }: GifPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || frames.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const fps = frames.length <= 6 ? 3 : frames.length <= 12 ? 4 : 6;
    const interval = 1000 / fps;

    const images: HTMLImageElement[] = frames.map((f) => {
      const img = new Image();
      img.src = f.url;
      return img;
    });

    let currentIndex = 0;
    let lastTime = 0;

    const { width, height } = frames[0];
    canvas.width = width;
    canvas.height = height;

    const draw = (timestamp: number) => {
      if (timestamp - lastTime >= interval) {
        const img = images[currentIndex];
        if (img.complete) {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

          ctx.fillStyle = 'rgba(0,0,0,0.55)';
          ctx.fillRect(8, canvas.height - 30, 90, 22);
          ctx.fillStyle = '#e2e8f0';
          ctx.font = `bold ${Math.max(11, Math.round(canvas.width / 80))}px monospace`;
          ctx.fillText(
            `${currentIndex + 1}/${frames.length}  ${frames[currentIndex].time.toFixed(2)}s`,
            14,
            canvas.height - 13,
          );
        }
        currentIndex = (currentIndex + 1) % frames.length;
        lastTime = timestamp;
      }
      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(rafRef.current);
    };
  }, [frames]);

  if (frames.length === 0) return null;

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
        Sequence preview — {frames.length} frame{frames.length !== 1 ? 's' : ''}
      </p>
      <canvas
        ref={canvasRef}
        className="w-full rounded-xl border border-edge bg-black object-contain"
        style={{ maxHeight: '280px', imageRendering: 'auto' }}
      />
      <p className="text-xs text-slate-500">
        Live loop · adjust the Sequence frames slider to see changes instantly
      </p>
    </div>
  );
}
