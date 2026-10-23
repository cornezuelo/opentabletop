import type { ClockDef, ClocksDef, ClockThen } from '@open-tabletop/world-engine'
import { localize } from './index'

/** A system's progress clocks: what its pack declares (`kind: clocks`). */
export interface SystemClocks {
  /** `pack/id` of the definition. */
  id: string
  pack: string
  def: ClocksDef
}

/** A declared clock as the world clock starts it: its name in a language, its segments. */
export interface StartingClock {
  ref: string
  name: string
  segments: number
  filled: number
  noteRef?: string
}

/** The clocks a world starts with, in the pack's order (named in `locale`). */
export function startClocks(
  system: SystemClocks,
  locale: string,
  fallback?: string,
): StartingClock[] {
  return Object.entries(system.def.clocks).map(([ref, c]) => ({
    ref,
    name: clockName(ref, c, locale, fallback),
    segments: c.segments,
    filled: Math.min(c.filled ?? 0, c.segments),
    ...(c.noteRef && { noteRef: c.noteRef }),
  }))
}

/** A declared clock's name in a language (its id, as words, when it has none). */
export const clockName = (ref: string, c: ClockDef, locale: string, fallback?: string): string =>
  localize(c.name, locale, fallback) ?? ref.replaceAll('-', ' ')

/** What becomes of a declared clock once full: `then`, `keep` by default (a clock made by hand stays). */
export const clockThen = (system: SystemClocks | undefined, ref: string | undefined): ClockThen =>
  (ref && system?.def.clocks[ref]?.then) || 'keep'
