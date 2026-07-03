/*
 * fileType.ts
 * -----------------------------------------------------------------------------
 * Shared file type detection utilities. Checks both MIME type and extension
 * fallback to handle files with missing/empty type metadata.
 *
 * Last updated: 2026-07-03 — Initial creation.
 * -----------------------------------------------------------------------------
 */

export function isImage(f: File): boolean {
  if (f.type.startsWith('image/')) return true;
  const ext = f.name.split('.').pop()?.toLowerCase();
  return ext === 'jpg' || ext === 'jpeg' || ext === 'png' || ext === 'webp' || ext === 'gif';
}

export function isVideo(f: File): boolean {
  if (f.type.startsWith('video/')) return true;
  const ext = f.name.split('.').pop()?.toLowerCase();
  return ext === 'mp4' || ext === 'webm' || ext === 'mov';
}
