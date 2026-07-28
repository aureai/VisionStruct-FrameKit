/*
 * PreviewGrid.tsx
 * -----------------------------------------------------------------------------
 * Read-only previews of the pipeline outputs: frame sequence + contact sheet(s).
 *
 * Last updated: 2026-07-28 — PixelFold dark theme.
 * -----------------------------------------------------------------------------
 */

import type { CapturedFrame, ContactSheet } from '../types';

interface PreviewGridProps {
  frames: CapturedFrame[];
  sheets: ContactSheet[];
}

export function PreviewGrid({ frames, sheets }: PreviewGridProps) {
  if (frames.length === 0) return null;

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-soft">
          Frame sequence · {frames.length}
        </h2>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
          {frames.map((f) => (
            <figure
              key={f.index}
              className="overflow-hidden rounded-xl border border-edge bg-mist/80"
            >
              <img src={f.url} alt={`Frame ${f.index}`} className="aspect-video w-full object-cover" />
              <figcaption className="flex justify-between px-2 py-1.5 text-[11px] text-ink-soft">
                <span className="font-semibold text-paper">#{f.index}</span>
                <span className="font-mono tabular-nums">{f.time.toFixed(2)}s</span>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-soft">
          Contact sheet{sheets.length > 1 ? `s · ${sheets.length}` : ''}
        </h2>
        <div className="space-y-4">
          {sheets.map((s) => (
            <img
              key={s.index}
              src={s.url}
              alt={`Contact sheet ${s.index}`}
              className="w-full rounded-2xl border border-edge shadow-elevated"
            />
          ))}
        </div>
      </section>
    </div>
  );
}
