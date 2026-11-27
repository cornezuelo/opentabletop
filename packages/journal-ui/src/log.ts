import { dayText, timelineText } from '@open-tabletop/campaign-ui'
import {
  toldAt,
  toldIn,
  type JournalFrom,
  type LogLine,
  type LogSession,
  type ToldMoment,
} from '@open-tabletop/journal'
import { entryLevel, JOURNAL_LEVELS, type JournalLevel } from '@open-tabletop/session'
import { formatClock, type Calendar } from '@open-tabletop/time'
import { translator as travelTranslator } from '@open-tabletop/travel-ui'
import { translator } from './i18n'
import { withoutSpans } from '@open-tabletop/styled-text'

/** What the log shows: up to a level, what was played in one place (`app:id`), some words. */
export interface LogFilter {
  level: JournalLevel
  from?: string
  search?: string
}

/** What the log's lines are said with: the UI's language, the campaign's calendar, the Oracle's names. */
export interface LogWords {
  locale: string
  calendar: Calendar
  nameOf: (id: string) => string
}

/** One day of the game in the log, newest line first. */
export interface LogDay {
  /** The calendar's day number. */
  day: number
  /** The day in words ("15 Thaw"). */
  text: string
  lines: LogLine[]
}

/** A session of the log, its days newest first. */
export interface ShownSession extends Omit<LogSession, 'lines'> {
  days: LogDay[]
}

/** The key of where a moment was played, for the filter. */
export const fromKey = (from: Pick<JournalFrom, 'app' | 'id'>): string => `${from.app}:${from.id}`

/** The places the log's moments were played in, each once, by name. */
export function logPlaces(log: readonly LogSession[]): (JournalFrom & { key: string })[] {
  const out = new Map<string, JournalFrom & { key: string }>()
  for (const session of log)
    for (const line of session.lines)
      if (line.kind === 'moment')
        out.set(fromKey(line.moment.from), { ...line.moment.from, key: fromKey(line.moment.from) })
  return [...out.values()].sort((a, b) => a.name.localeCompare(b.name))
}

/** A moment told in the UI's language at a level. */
export const momentAt = (
  line: Extract<LogLine, { kind: 'moment' }>,
  locale: string,
  level: JournalLevel,
): ToldMoment & { why: string[] } => toldAt(toldIn(line.moment, locale), level)

/** A line of the log in words (a moment: its title, its lines at a level and its changes). */
export function lineText(line: LogLine, words: LogWords, level: JournalLevel): string {
  switch (line.kind) {
    case 'moment': {
      const told = momentAt(line, words.locale, level)
      return [told.title, ...told.lines.map((l) => l.text), ...told.changes].join(' · ')
    }
    case 'world':
      return timelineText(line.entry, words.calendar, words.locale)
    case 'oracle':
      return `${words.nameOf(line.roll.source)}: ${line.roll.resolution.text ?? '—'}`
    case 'note':
      return line.note.text
  }
}

/**
 * Whether a moment says anything at a level: one of its lines is of that level or above, or
 * it's important (a moment where only a check that didn't come up was told is left out of the
 * story).
 */
function momentShown(line: Extract<LogLine, { kind: 'moment' }>, level: JournalLevel): boolean {
  const at = JOURNAL_LEVELS.indexOf(level)
  return (
    line.moment.entries.some((e) => JOURNAL_LEVELS.indexOf(entryLevel(e)) <= at) ||
    Object.values(line.moment.told).some((told) => told.notable)
  )
}

/**
 * The log as shown, newest first: its sessions, their days and their lines, those a filter
 * lets through (a level: moments that say something at it; one place: only its moments;
 * words: lines that say them, at the level shown).
 * A session with nothing left is kept while nothing is searched (it says when it was played).
 */
export function shownLog(
  log: readonly LogSession[],
  filter: LogFilter,
  words: LogWords,
): ShownSession[] {
  const search = (filter.search ?? '').trim().toLocaleLowerCase()
  const passes = (line: LogLine) =>
    (line.kind !== 'moment' || momentShown(line, filter.level)) &&
    (!filter.from || (line.kind === 'moment' && fromKey(line.moment.from) === filter.from)) &&
    (!search || lineText(line, words, filter.level).toLocaleLowerCase().includes(search))
  const filtered = !!filter.from || !!search
  return [...log].reverse().flatMap((session) => {
    const days: LogDay[] = []
    for (const line of [...session.lines].reverse()) {
      if (!passes(line)) continue
      const day = words.calendar.describe(line.time).day
      if (days.at(-1)?.day !== day)
        days.push({ day, text: dayText(words.calendar, line.time, words.locale), lines: [] })
      days.at(-1)!.lines.push(line)
    }
    const shown: ShownSession = {
      ...(session.session && { session: session.session }),
      ...(session.number !== undefined && { number: session.number }),
      days,
    }
    return days.length || (!filtered && session.session) ? [shown] : []
  })
}

/** The time of a line in the calendar's day (`08:00`). */
export const lineClock = (line: LogLine, calendar: Calendar): string =>
  formatClock(calendar.describe(line.time))

/** A session's heading: its number and the real date it was played on. */
export function sessionTitle(session: Omit<ShownSession, 'days'>, locale: string): string {
  const t = translator(() => locale)
  if (!session.session) return t('log.outside')
  const date = new Date(session.session.at).toLocaleDateString(locale, { dateStyle: 'medium' })
  return `${t('log.session', { n: session.number ?? 0 })} · ${date}`
}

/**
 * The log as shown, as Markdown, oldest first: its sessions and days as headings, each line
 * with its time, a moment's lines and changes under its title; for a notes app.
 */
export function logMarkdown(
  shown: readonly ShownSession[],
  title: string,
  words: LogWords,
  level: JournalLevel,
): string {
  const t = translator(() => words.locale)
  const tt = travelTranslator(() => words.locale)
  const out = [`# ${title}`]
  // On one line, its Markdown kept and its styled spans' colours dropped (a notes app has none).
  const flat = (text: string) => withoutSpans(text).replace(/\s*\n\s*/g, ' ')
  for (const session of [...shown].reverse()) {
    out.push('', `## ${sessionTitle(session, words.locale)}`)
    for (const day of [...session.days].reverse()) {
      out.push('', `### ${day.text}`, '')
      for (const line of [...day.lines].reverse()) {
        const clock = `**${lineClock(line, words.calendar)}**`
        if (line.kind === 'moment') {
          const told = momentAt(line, words.locale, level)
          out.push(`- ${clock} ${flat(told.title)}`)
          for (const l of told.lines) out.push(`  - ${flat(l.text)}`)
          if (told.changes.length) out.push(`  - _${told.changes.join(', ')}_`)
          if (told.why.length) out.push(`  - ${tt('beats.why')}: ${told.why.map(flat).join('; ')}`)
        } else if (line.kind === 'note') out.push(`- ${clock} _${flat(line.note.text)}_`)
        else
          out.push(
            `- ${clock} ${line.kind === 'world' ? t('log.world') : t('log.oracle')}: ${flat(lineText(line, words, level))}`,
          )
      }
    }
  }
  return `${out.join('\n')}\n`
}
