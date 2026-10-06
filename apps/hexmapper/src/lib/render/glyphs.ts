/**
 * A subtle shade of a terrain color for its glyph: darker on light colors, lighter on
 * dark ones, so the symbol blends in instead of standing out.
 */
export function glyphShade(color: string): number {
  const n = parseInt(color.slice(1), 16) || 0
  const rgb = [(n >> 16) & 255, (n >> 8) & 255, n & 255]
  const luminance = (0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2]) / 255
  const out = rgb.map((c) => Math.round(luminance > 0.45 ? c * 0.55 : c + (255 - c) * 0.45))
  return (out[0] << 16) | (out[1] << 8) | out[2]
}
