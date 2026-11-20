import type { HistoryItem } from '@open-tabletop/oracle-engine'
import type { JournalEntry, JournalLevel, RolledNode } from '@open-tabletop/session'
import type { TimelineEntry } from '@open-tabletop/world-engine'

/**
 * The campaign's journal (docs/notes-and-journal.md §2): one record of the whole campaign,
 * kept after its trips end. Its trips' and scenes' moments are copied in as they're played,
 * told already in each of the UI's languages (the trip that could tell them again is gone
 * one day); sessions and the player's notes are written here. The world's lines (the
 * campaign's timeline) and the Oracle's hand rolls (its history) aren't copied: they're read
 * where they're kept and laid among these by game time (`campaignLog`).
 */

/** v1: moments, sessions and notes. */
export const JOURNAL_FORMAT = 1

/** Where a moment was played: the app, its id there (a map's, a trip's, a scene's) and its name. */
export interface JournalFrom {
  app: string
  id: string
  name: string
}

/** A die rolled, as a moment told keeps it (to draw it); `inside`: rolled within a row's result. */
export type ToldDie = NonNullable<RolledNode['results']>[number] & { inside?: boolean }

/** A line of a moment told: its text, whether it's important, its level, its dice and cards. */
export interface ToldLine {
  id: string
  text: string
  notable: boolean
  level: JournalLevel
  dice?: ToldDie[]
  cards?: NonNullable<RolledNode['face']>[]
}

/** A moment told in one language, at the whole detail (a level shows part of it: `toldAt`). */
export interface ToldMoment {
  title: string
  lines: ToldLine[]
  /** What it changed, a short text each. */
  changes: string[]
  notable: boolean
}

/** A moment of a trip or a scene, as it was played: its lines and how they were told. */
export interface JournalMoment {
  kind: 'moment'
  id: string
  /** Game time it ended at (its last line's). */
  time: number
  /** Real time it was played. */
  at: string
  from: JournalFrom
  entries: JournalEntry[]
  /** Told in each of the UI's languages, by locale. */
  told: Record<string, ToldMoment>
}

/** A session of play: when it started (game and real time) and, once ended, when it ended. */
export interface JournalSession {
  kind: 'session'
  id: string
  time: number
  at: string
  end?: { time: number; at: string }
}

/** The player's own writing (Markdown), at a moment of the game. */
export interface JournalNote {
  kind: 'note'
  id: string
  time: number
  at: string
  text: string
  /** Real time it was last changed. */
  edited?: string
}

export type JournalItem = JournalMoment | JournalSession | JournalNote

export interface CampaignJournal {
  format: typeof JOURNAL_FORMAT
  campaign: string
  items: JournalItem[]
  /**
   * How far each trip's journal was copied: the number of its last line copied, by the real
   * time of its first line (a trip's own: it goes on in another map, a new one starts there).
   */
  copied: Record<string, number>
  nextId: number
}

export function emptyJournal(campaign: string): CampaignJournal {
  return { format: JOURNAL_FORMAT, campaign, items: [], copied: {}, nextId: 1 }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isItem = (value: unknown): value is JournalItem =>
  isRecord(value) &&
  typeof value.id === 'string' &&
  typeof value.time === 'number' &&
  typeof value.at === 'string' &&
  ((value.kind === 'moment' &&
    isRecord(value.from) &&
    Array.isArray(value.entries) &&
    isRecord(value.told)) ||
    value.kind === 'session' ||
    (value.kind === 'note' && typeof value.text === 'string'))

/** A journal read back from its JSON; undefined if it isn't one (or is of a newer format). */
export function readJournal(json: string): CampaignJournal | undefined {
  let raw: unknown
  try {
    raw = JSON.parse(json)
  } catch {
    return undefined
  }
  if (!isRecord(raw) || raw.format !== JOURNAL_FORMAT || typeof raw.campaign !== 'string')
    return undefined
  const items = Array.isArray(raw.items) ? raw.items.filter(isItem) : []
  const copied: Record<string, number> = {}
  if (isRecord(raw.copied))
    for (const [key, value] of Object.entries(raw.copied))
      if (typeof value === 'number') copied[key] = value
  const nextId =
    typeof raw.nextId === 'number' && Number.isFinite(raw.nextId) ? raw.nextId : items.length + 1
  return { format: JOURNAL_FORMAT, campaign: raw.campaign, items, copied, nextId }
}

/** The number of a journal line (`j12` → 12). */
const lineNumber = (e: { id: string }) => Number(e.id.slice(1)) || 0

/** The lines of a trip's journal not copied yet: those after the last one copied. */
export function linesToCopy(
  journal: CampaignJournal,
  lines: readonly JournalEntry[],
): JournalEntry[] {
  const first = lines[0]
  if (!first) return []
  const upTo = journal.copied[first.at] ?? 0
  return lines.filter((e) => lineNumber(e) > upTo)
}

/**
 * The journal with a trip's moments added (each its lines and how they're told), and that
 * trip's journal marked copied up to its last line (`lines`, the whole trip's journal).
 */
export function addMoments(
  journal: CampaignJournal,
  from: JournalFrom,
  lines: readonly JournalEntry[],
  moments: readonly { entries: JournalEntry[]; told: Record<string, ToldMoment> }[],
): CampaignJournal {
  const first = lines[0]
  const last = lines.at(-1)
  if (!first || !last) return journal
  let nextId = journal.nextId
  const added: JournalMoment[] = moments.flatMap(({ entries, told }) => {
    const end = entries.at(-1)
    return end
      ? [
          {
            kind: 'moment' as const,
            id: `m${nextId++}`,
            time: Math.max(...entries.map((e) => e.time)),
            at: entries[0]!.at,
            from: { ...from },
            entries,
            told,
          },
        ]
      : []
  })
  return {
    ...journal,
    items: [...journal.items, ...added],
    copied: { ...journal.copied, [first.at]: lineNumber(last) },
    nextId,
  }
}

/** The session going on (started and not ended), if any. */
export const openSession = (journal: CampaignJournal): JournalSession | undefined =>
  journal.items.findLast((i): i is JournalSession => i.kind === 'session' && !i.end)

/** The journal with a session started at a moment of the game (the one going on ended first). */
export function startSession(journal: CampaignJournal, time: number, at: string): CampaignJournal {
  const ended = endSession(journal, time, at)
  return {
    ...ended,
    items: [...ended.items, { kind: 'session', id: `s${ended.nextId}`, time, at }],
    nextId: ended.nextId + 1,
  }
}

/** The journal with the session going on ended (unchanged without one). */
export function endSession(journal: CampaignJournal, time: number, at: string): CampaignJournal {
  const open = openSession(journal)
  if (!open) return journal
  return {
    ...journal,
    items: journal.items.map((i) =>
      i === open ? { ...open, end: { time: Math.max(time, open.time), at } } : i,
    ),
  }
}

/** The journal with a note of the player's at a moment of the game. */
export function addNote(
  journal: CampaignJournal,
  note: { time: number; at: string; text: string },
): CampaignJournal {
  return {
    ...journal,
    items: [...journal.items, { kind: 'note', id: `n${journal.nextId}`, ...note }],
    nextId: journal.nextId + 1,
  }
}

/** The journal with a note's text changed. */
export function editNote(
  journal: CampaignJournal,
  id: string,
  text: string,
  at: string,
): CampaignJournal {
  return {
    ...journal,
    items: journal.items.map((i) =>
      i.id === id && i.kind === 'note' ? { ...i, text, edited: at } : i,
    ),
  }
}

/** The journal without one of its items (a note, a moment, a session's mark). */
export function removeItem(journal: CampaignJournal, id: string): CampaignJournal {
  return { ...journal, items: journal.items.filter((i) => i.id !== id) }
}

/** A moment told in a language: that one's words, else English's, else any. */
export function toldIn(moment: JournalMoment, locale: string): ToldMoment {
  return (
    moment.told[locale] ??
    moment.told.en ??
    Object.values(moment.told)[0] ?? { title: '', lines: [], changes: [], notable: false }
  )
}

const LEVELS: readonly JournalLevel[] = ['story', 'mechanics', 'detail']

/**
 * A moment told at a level, as a trip's journal tells it (travel-ui's `tellBeat`): the lines
 * that level shows and every important one; below the whole detail, a change is said only
 * among its changes; at the story, the rules' lines go apart (`why`).
 */
export function toldAt(told: ToldMoment, level: JournalLevel): ToldMoment & { why: string[] } {
  const at = LEVELS.indexOf(level)
  const lines: ToldLine[] = []
  const why: string[] = []
  for (const line of told.lines) {
    if (line.notable || LEVELS.indexOf(line.level) <= at) lines.push(line)
    else if (level === 'story' && line.level === 'mechanics') why.push(line.text)
  }
  return { ...told, lines, why }
}

/** A line of the campaign's log: a moment, a note, the world's line or a hand roll. */
export type LogLine =
  | { kind: 'moment'; time: number; at: string; moment: JournalMoment }
  | { kind: 'note'; time: number; at: string; note: JournalNote }
  | { kind: 'world'; time: number; at: string; entry: TimelineEntry }
  | { kind: 'oracle'; time: number; at: string; roll: HistoryItem }

/** The log's lines under a session (none: those played outside one), oldest first. */
export interface LogSession {
  session?: JournalSession
  /** Its number, the sessions counted in order from 1. */
  number?: number
  lines: LogLine[]
}

/**
 * When a hand roll happened in the game: rolls keep only the real time they were made, so
 * each is laid at the game time of what the journal holds last before it in real time (a
 * moment played, a note, a session started), else at its first's.
 */
function rollTime(at: string, anchors: readonly { time: number; at: string }[]): number {
  let time: number | undefined
  for (const anchor of anchors) {
    if (anchor.at <= at) time = anchor.time
    else break
  }
  return time ?? anchors[0]?.time ?? 0
}

/**
 * The whole campaign as its log reads it, oldest first: the journal's moments and notes, the
 * world's timeline and the Oracle's hand rolls, by game time (what happened at the same time
 * in the order it was written), split by the sessions they fall in (from a session's start
 * to the next one's).
 */
export function campaignLog(
  journal: CampaignJournal,
  timeline: readonly TimelineEntry[] = [],
  history: readonly HistoryItem[] = [],
): LogSession[] {
  const anchors = journal.items
    .map(({ time, at }) => ({ time, at }))
    .sort((a, b) => (a.at < b.at ? -1 : a.at > b.at ? 1 : 0))
  const lines: LogLine[] = [
    ...journal.items.flatMap((i): LogLine[] =>
      i.kind === 'moment'
        ? [{ kind: 'moment', time: i.time, at: i.at, moment: i }]
        : i.kind === 'note'
          ? [{ kind: 'note', time: i.time, at: i.at, note: i }]
          : [],
    ),
    // The world's lines have no real time: they come first among those of their minute.
    ...timeline.map((entry): LogLine => ({ kind: 'world', time: entry.time, at: '', entry })),
    ...history.map((roll): LogLine => ({
      kind: 'oracle',
      time: rollTime(roll.at, anchors),
      at: roll.at,
      roll,
    })),
  ]
  // Stable: the timeline's lines keep their order among themselves.
  lines.sort((a, b) => a.time - b.time || (a.at < b.at ? -1 : a.at > b.at ? 1 : 0))
  const sessions = journal.items
    .filter((i): i is JournalSession => i.kind === 'session')
    .sort((a, b) => a.time - b.time || (a.at < b.at ? -1 : 1))
  const out: LogSession[] = []
  const before = lines.filter((l) => !sessions[0] || l.time < sessions[0].time)
  if (before.length || !sessions.length) out.push({ lines: before })
  sessions.forEach((session, i) => {
    const next = sessions[i + 1]
    out.push({
      session,
      number: i + 1,
      lines: lines.filter((l) => l.time >= session.time && (!next || l.time < next.time)),
    })
  })
  return out
}
