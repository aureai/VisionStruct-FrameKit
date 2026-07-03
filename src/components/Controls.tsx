/*
 * Controls.tsx
 * -----------------------------------------------------------------------------
 * Settings panel for the FrameKit pipeline. Renders sliders/selects bound to the
 * FrameKitSettings object and reports changes upward. Kept presentational; all
 * processing lives in the lib/ modules and the useFrameKit hook.
 *
 * Last updated: 2026-06-29 — Initial creation.
 * -----------------------------------------------------------------------------
 */

import type { FrameKitSettings, ImageFormat } from '../types';

interface ControlsProps {
  settings: FrameKitSettings;
  disabled?: boolean;
  onChange: (patch: Partial<FrameKitSettings>) => void;
}

function Slider(props: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  disabled?: boolean;
  onChange: (v: number) => void;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="flex justify-between text-sm text-slate-300">
        <span>{props.label}</span>
        <span className="font-mono text-slate-100">{props.value}</span>
      </span>
      <input
        type="range"
        min={props.min}
        max={props.max}
        step={props.step ?? 1}
        value={props.value}
        disabled={props.disabled}
        onChange={(e) => props.onChange(Number(e.target.value))}
        className="w-full accent-accent"
      />
    </label>
  );
}

export function Controls({ settings, disabled, onChange }: ControlsProps) {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
      <Slider
        label="Sequence frames"
        value={settings.sequenceCount}
        min={1}
        max={40}
        disabled={disabled}
        onChange={(v) => onChange({ sequenceCount: v })}
      />
      <Slider
        label="Contact-sheet frames"
        value={settings.sheetFrameCount}
        min={2}
        max={40}
        disabled={disabled}
        onChange={(v) => onChange({ sheetFrameCount: v })}
      />
      <Slider
        label="Sheet columns"
        value={settings.sheetColumns}
        min={1}
        max={8}
        disabled={disabled}
        onChange={(v) => onChange({ sheetColumns: v })}
      />
      <Slider
        label="Tile max edge (px)"
        value={settings.tileMaxEdge}
        min={256}
        max={1024}
        step={64}
        disabled={disabled}
        onChange={(v) => onChange({ tileMaxEdge: v })}
      />
      <Slider
        label="Max frames / sheet"
        value={settings.maxFramesPerSheet}
        min={4}
        max={40}
        disabled={disabled}
        onChange={(v) => onChange({ maxFramesPerSheet: v })}
      />
      <label className="block space-y-1.5">
        <span className="text-sm text-slate-300">Frame format</span>
        <select
          value={settings.format}
          disabled={disabled}
          onChange={(e) => onChange({ format: e.target.value as ImageFormat })}
          className="w-full rounded-lg border border-edge bg-ink px-3 py-2 text-sm text-slate-100 outline-none focus:border-accent"
        >
          <option value="png">PNG (lossless)</option>
          <option value="jpeg">JPEG (smaller)</option>
        </select>
      </label>
    </div>
  );
}
