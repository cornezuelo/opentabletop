import {
  addMoments,
  emptyJournal,
  linesToCopy,
  readJournal,
  type JournalFrom,
  type ToldMoment,
} from '@open-tabletop/journal'
import {
  beatsOf,
  type JournalEntry,
  type SessionState,
  type TravelSystem,
} from '@open-tabletop/session'
import { changeJournalEntry } from '@open-tabletop/storage'
import { tellBeat } from './beats'
import { TRAVEL_LOCALES, translator } from './i18n'
import { journalContext } from './journalContext'

/** What a host names in a trip's lines, in a language: its hexes, terrains, the Oracle's tables. */
export interface JournalWords {
  hexLabel?: (hex: string) => string
  terrainName?: (id: string) => string
  nameOf?: (id: string) => string
}

/** What a trip's moments are told with: its system, its state now and the host's words. */
export interface TripTelling {
  system: TravelSystem
  session: SessionState
  /** Calendar day the trip started. */
  startDay: number
  /** The host's facts (the world clock's). */
  facts?: Record<string, unknown>
  words: (locale: string) => JournalWords
}

/** Codes of lines the campaign's log reads where they're kept: the world's (its timeline). */
const WORLD_CODES = new Set(['WORLD_EVENT', 'HOLIDAY', 'CLOCK_FILLED', 'WORLD_TURN'])

/**
 * Whether a moment is the campaign's to keep: a step's (its lines carry their moment), or a
 * line of its own that isn't a hand roll (the Oracle's history has it) nor what came due in
 * the world (its timeline has it).
 */
const kept = (entries: readonly JournalEntry[]): boolean => {
  const first = entries[0]!
  if (first.beat !== undefined) return true
  return !(first.source === 'oracle' || first.code === 'ORACLE_ROLL' || WORLD_CODES.has(first.code))
}

/**
 * A trip's lines as moments for its campaign's journal, each told at the whole detail in
 * every language the UI speaks (the trip that could tell them again is gone one day).
 */
export function tellMoments(
  o: TripTelling,
  lines: readonly JournalEntry[],
): { entries: JournalEntry[]; told: Record<string, ToldMoment> }[] {
  const moments = beatsOf(lines).filter((b) => kept(b.entries))
  if (!moments.length) return []
  const contexts = TRAVEL_LOCALES.map((locale) => ({
    locale,
    context: journalContext({
      system: o.system,
      session: o.session,
      locale,
      t: translator(() => locale),
      startDay: o.startDay,
      ...(o.facts && { facts: o.facts }),
      ...o.words(locale),
    }),
  }))
  return moments.map((beat) => ({
    entries: structuredClone(beat.entries),
    told: Object.fromEntries(
      contexts.map(({ locale, context }) => {
        const { title, lines, changes, notable } = tellBeat(beat, context, 'detail')
        return [locale, { title, lines, changes, notable }]
      }),
    ),
  }))
}

/** The last line of each trip copied, as this page last saw it (by campaign and the trip's start). */
const seen = new Map<string, string>()

/**
 * Copies into the campaign's journal the moments of a trip played in it that it hasn't got
 * yet (after each step, edit or note: what the trip's journal has new). Nothing is read or
 * written when nothing is new since the last copy this page made.
 */
export function keepInJournal(
  campaign: { id: string; name: string },
  from: JournalFrom,
  telling: TripTelling,
): Promise<void> {
  const journal = telling.session.journal
  const first = journal[0]
  const last = journal.at(-1)
  if (!first || !last) return Promise.resolve()
  const key = `${campaign.id}|${first.at}`
  if (seen.get(key) === last.id) return Promise.resolve()
  seen.set(key, last.id)
  return changeJournalEntry(campaign.id, campaign.name, (json) => {
    const read = json === undefined ? emptyJournal(campaign.id) : readJournal(json)
    // One of a newer format is left as it is.
    if (!read) return undefined
    const kept = read
    const lines = linesToCopy(kept, journal)
    if (!lines.length) return undefined
    return JSON.stringify(addMoments(kept, from, journal, tellMoments(telling, lines)))
  }).catch((error: unknown) => {
    // Not copied: the next save tries again.
    seen.delete(key)
    console.error(error)
  })
}
