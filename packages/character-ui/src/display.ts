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
  /** The tone of its threshold reached, if the sheet gives tones. */
  tone?: Tone
  /** How full it is, 0 to 1 (for bars), when it has both bounds or a max. */
  fill?: number
  /** For levels: each level's name and description, and which one it's at (or none). */
  levels?: { id: string; name: string; description?: string }[]
  level?: number
}

/**
 * How a value looks now: its display (a track is boxes), its tone, how full it is and,
 * with levels, which named level it's at (the first is its min, or 0).
 */
export function valueView(
  looks: Looks,
  value: number,
  bounds: { min?: number; max?: number },
  locale: string,
): ValueView {
  const display = displayOf(looks)
  const view: ValueView = { display, value, ...bounds, tone: toneOf(looks.tones, value) }
  if (bounds.max !== undefined) {
    const from = Math.min(bounds.min ?? 0, 0)
    const span = bounds.max - from
    view.fill =
      span > 0 ? Math.min(1, Math.max(0, (value - from) / span)) : value >= bounds.max ? 1 : 0
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
