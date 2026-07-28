/*
 * ProgressBar.tsx
 * -----------------------------------------------------------------------------
 * Thin status/progress indicator driven by the pipeline's ProgressState.
 *
 * Last updated: 2026-07-28 — PixelFold dark theme.
 * -----------------------------------------------------------------------------
 */

import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import type { ProgressState } from '../types';

export function ProgressBar({ progress }: { progress: ProgressState }) {
  if (progress.phase === 'idle') return null;

  const isError = progress.phase === 'error';
  const isDone = progress.phase === 'done';
  const pct = progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : isDone ? 100 : 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm">
        {isError ? (
          <AlertCircle className="h-4 w-4 text-red-400" />
        ) : isDone ? (
          <CheckCircle2 className="h-4 w-4 text-leaf" />
        ) : (
          <Loader2 className="h-4 w-4 animate-spin text-leaf" />
        )}
        <span className={isError ? 'text-red-400' : 'text-ink-soft'}>{progress.message}</span>
      </div>
      {!isError && (
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-mist">
          <div
            className="h-full rounded-full bg-leaf transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  );
}
