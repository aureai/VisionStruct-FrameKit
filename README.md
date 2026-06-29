# VisionStruct FrameKit

Turn a short video clip into **analysis-ready outputs** for AI image/video models:

1. **Frame sequence** — up to 15 evenly-spaced frames that convey micro-movement (Dense Frame Mode).
2. **Labeled contact sheet** — a single grid image with each frame tagged `Frame N` + timestamp, for single-image model analysis.

Everything runs **100% in the browser** — clips are never uploaded. Built with Vite + React + TypeScript + Tailwind, deployable to Vercel as a static site.

## Why

Multimodal models sample uploaded video at ~1 FPS. For clips under ~2 seconds that means only 1–2 frames are seen, missing the motion entirely. FrameKit extracts dense frames locally so you can hand the model either a frame sequence or a single labeled contact sheet.

## Quick start

```bash
npm install
npm run dev      # local dev server
npm run build    # production build -> dist/
npm run preview  # preview the production build
```

## Deploy to Vercel

- Push this folder to a Git repo and import it in Vercel (framework auto-detected as **Vite**), **or**
- Run `npm run build` and drag the `dist/` folder into Vercel.

No environment variables or server functions are required.

## Output structure

The **Download ZIP** button produces:

```
<clip>_visionstruct.zip
├── frames/                         # sequential frames (motion)
│   ├── frame_01_t0.00s.png
│   └── ...
├── contact-sheet/                  # labeled grid image(s)
│   └── contact_sheet.png
└── manifest.txt                    # source info + sampled timestamps
```

## Settings

- **Sequence frames** (1–15) — frames in the motion folder.
- **Contact-sheet frames** — how many frames pack into the sheet (auto-splits across multiple sheets past the per-sheet cap).
- **Sheet columns** — grid width.
- **Tile max edge** — caps each tile's resolution so a busy sheet keeps per-frame detail instead of over-downsampling.
- **Frame format** — PNG (lossless) or JPEG (smaller).

## Codec support

Uses the browser's native `<video>` decoder. **MP4 (H.264)** and **WebM** are the most reliable. `MOV / HEVC / ProRes` support varies by browser; if a clip fails to load, re-export as MP4.

> Planned (Phase 2): an `ffmpeg.wasm` fallback to decode any codec. It requires `Cross-Origin-Opener-Policy` / `Cross-Origin-Embedder-Policy` headers, which can be set via `vercel.json` when added.

## Project layout

```
src/
├── lib/
│   ├── extractFrames.ts   # video load + precise seeking + canvas capture
│   ├── contactSheet.ts    # labeled grid composition + multi-sheet split
│   └── packageZip.ts       # two-folder ZIP + manifest + download
├── hooks/useFrameKit.ts    # pipeline orchestration + URL lifecycle
├── components/             # Dropzone, Controls, ProgressBar, PreviewGrid
├── types.ts                # shared contracts + DEFAULT_SETTINGS
└── App.tsx                 # UI shell
```
