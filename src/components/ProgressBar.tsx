/*
 * ProgressBar.tsx
 * -----------------------------------------------------------------------------
 * Thin status/progress indicator driven by the pipeline's ProgressState.
 * Shows a determinate bar while extracting frames and a message line for every
 * phase, including a distinct error style.
 *
 * Last updated: 2026-06-29 — Initial creation.
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
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
        ) : (
          <Loader2 className="h-4 w-4 animate-spin text-accent" />
        )}
        <span className={isError ? 'text-red-300' : 'text-slate-300'}>{progress.message}</span>
      </div>
      {!isError && (
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-edge">
          <div
            className="h-full rounded-full bg-accent transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  );
}
