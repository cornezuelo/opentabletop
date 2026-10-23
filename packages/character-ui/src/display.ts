import {
  displayOf,
  levelId,
  toneOf,
  type Display,
  type SheetText,
  type Tone,
} from '@open-tabletop/character-engine'
import { idName, sheetText } from './texts'

/** How a value (or a relation's number) says it's shown: its display, levels and tones. */
export interface Looks {
  display?: Display
  track?: boolean
  levels?: (string | { id: string; name?: SheetText; description?: SheetText })[]
  tones?: Record<string, Tone>
}

/** What a value looks like now, for drawing it. */
export interface ValueView {
  display: Display
  value: number
  /** Its bounds now (a max that's another value, read). */
  min?: number
  max?: number
  /** What it's drawn against when that isn't its max (`of:`, a load against a capacity). */
  of?: number
  /** The tone of its threshold reached, if the sheet gives tones. */
  tone?: Tone
  /** How full it is, 0 to 1 (for bars), against its `of` or its max. */
  fill?: number
  /** For levels: each level's name and description, and which one it's at (or none). */
  levels?: { id: string; name: string; description?: string }[]
  level?: number
}

/**
 * How a value looks now: its display (a track is boxes), its tone, how full it is and,
 * with levels, which named level it's at (the first is its min, or 0). `bounds.of` is
 * what it's drawn against when that isn't its max; its tones' thresholds are already read.
 */
export function valueView(
  looks: Looks,
  value: number,
  bounds: { min?: number; max?: number; of?: number },
  locale: string,
): ValueView {
  const display = displayOf(looks)
  const against = bounds.of ?? bounds.max
  const view: ValueView = {
    display,
    value,
    ...bounds,
    tone: toneOf(looks.tones, value, against),
  }
  if (against !== undefined) {
    const from = Math.min(bounds.min ?? 0, 0)
    const span = against - from
    view.fill =
      span > 0 ? Math.min(1, Math.max(0, (value - from) / span)) : value >= against ? 1 : 0
  }
  if (display === 'levels' && looks.levels) {
    view.levels = looks.levels.map((l) => {
      const id = levelId(l)
      const named = typeof l === 'string' ? undefined : l
      return {
        id,
        name: sheetText(named?.name, locale) ?? idName(id),
        ...(named?.description !== undefined && {
          description: sheetText(named.description, locale),
        }),
      }
    })
    const at = value - (bounds.min ?? 0)
    if (Number.isInteger(at) && at >= 0 && at < view.levels.length) view.level = at
  }
  return view
}

/** The value a level stands for (the first is the min, or 0). */
export const levelValue = (index: number, min: number | undefined): number => (min ?? 0) + index
