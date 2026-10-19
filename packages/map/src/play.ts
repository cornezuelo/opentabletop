import type { HexMap } from './types'

/**
 * The parts of a map that change by playing (a trip, the world clock, factions, the Oracle,
 * roster characters on tokens, which layers show), saved with the map but outside the
 * editor's undo history. Other apps (the Campaign app, the Characters app) change only these.
 */
export const PLAY_PARTS = [
  'play',
  'oracle',
  'world',
  'worldWeather',
  'factions',
  'tokens',
  'layers',
] as const

export type PlayPart = (typeof PLAY_PARTS)[number]

/** JSON with keys in order, so two maps built in different ways compare equal. */
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`
  if (value && typeof value === 'object')
    return `{${Object.keys(value)
      .filter((k) => (value as Record<string, unknown>)[k] !== undefined)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${canonical((value as Record<string, unknown>)[k])}`)
      .join(',')}}`
  return JSON.stringify(value) ?? 'null'
}

/**
 * What changed between two versions of a map (the one open here, and the one another
 * window or app saved): the play parts that differ, or `null` when the map itself changed
 * too (hexes, paths, terrains, settings…), so it can't be taken without its undo history.
 * When it was last modified doesn't count.
 */
export function playChanges(before: HexMap, after: HexMap): PlayPart[] | null {
  const rest = (map: HexMap) => {
    const copy: Record<string, unknown> = { ...map, meta: { ...map.meta, modified: undefined } }
    for (const part of PLAY_PARTS) delete copy[part]
    return canonical(copy)
  }
  if (rest(before) !== rest(after)) return null
  return PLAY_PARTS.filter((part) => canonical(before[part]) !== canonical(after[part]))
}
