/*
 * PreviewGrid.tsx
 * -----------------------------------------------------------------------------
 * Read-only previews of the pipeline outputs: the extracted frame sequence
 * (thumbnail grid with frame index + timestamp) and the rendered contact
 * sheet(s). Image sources are object URLs owned by the useFrameKit hook.
 *
 * Last updated: 2026-06-29 — Initial creation.
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
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
          Frame sequence · {frames.length}
        </h2>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
          {frames.map((f) => (
            <figure key={f.index} className="overflow-hidden rounded-lg border border-edge bg-ink">
              <img src={f.url} alt={`Frame ${f.index}`} className="aspect-video w-full object-cover" />
              <figcaption className="flex justify-between px-2 py-1 text-[11px] text-slate-400">
                <span className="text-slate-200">#{f.index}</span>
                <span className="font-mono">{f.time.toFixed(2)}s</span>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
          Contact sheet{sheets.length > 1 ? `s · ${sheets.length}` : ''}
        </h2>
        <div className="space-y-4">
          {sheets.map((s) => (
            <img
              key={s.index}
              src={s.url}
              alt={`Contact sheet ${s.index}`}
              className="w-full rounded-xl border border-edge"
            />
          ))}
        </div>
      </section>
    </div>
  );
}
