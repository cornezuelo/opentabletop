import type { JournalEntry } from '@open-tabletop/session'
import { defaultCalendar, formatClock } from '@open-tabletop/time'
import { idText, type Translate, type TravelUiKey } from './i18n'

/** What turns journal entries into text: the host names hexes and Oracle definitions. */
export interface JournalContext {
  t: Translate
  /** Calendar day the trip started (shown as day 1). */
  startDay: number
  hexLabel: (hex: string) => string
  nameOf: (id: string) => string
  /** Name of one of the system's own actions (forage…). */
  actionName?: (id: string) => string
}

export const eventName = (t: Translate, event: unknown) =>
  idText(t, `events.${String(event)}`, String(event))

/** One journal entry as a line of text in the UI language. */
export function entryText(
  e: JournalEntry,
  { t, startDay, hexLabel, nameOf, actionName }: JournalContext,
) {
  const d = (e.data ?? {}) as Record<string, unknown>
  switch (e.code) {
    case 'ACTION_TAKEN':
      return actionName?.(String(d.action)) ?? idText(t, `actions.${d.action}`, String(d.action))
    case 'ORACLE_RESULT':
      return `${eventName(t, d.event)}: ${e.text ?? '—'}`
    case 'ORACLE_ROLL':
      return `${nameOf(String(d.table))}: ${e.text ?? '—'}`
    case 'CHECK_PENDING':
      return t('journal.pending', { event: eventName(t, d.event) })
    case 'DISCOVERY_FAILED':
      return t('journal.discoveryFailed', { hex: hexLabel(String(d.hex)), error: e.text ?? '' })
    case 'CHECK_FAILED':
      return t('journal.failed', { event: eventName(t, d.event), error: e.text ?? '' })
    case 'HEX_ENTERED':
      return t('journal.entered', { hex: hexLabel(String(d.hex)) })
    case 'HEX_DISCOVERED':
      return t('journal.discovered', { hex: hexLabel(String(d.hex)), what: e.text ?? '—' })
    case 'DAY_STARTED':
      return t('journal.day', { day: Number(d.day) - startDay + 1 })
    case 'RESOURCE_DEPLETED':
      return t('journal.depleted', {
        resource: idText(t, `resources.${d.resource}`, String(d.resource)),
      })
    case 'TRAVEL_STOPPED':
      return t(`stop.${String(d.reason)}` as TravelUiKey)
    case 'NOTE':
      return e.text ?? ''
    default:
      return idText(t, `journal.${e.code}`, e.code)
  }
}

/** The trip day an entry belongs to (1 = the day the trip started). */
export const tripDay = (e: JournalEntry, startDay: number) =>
  defaultCalendar.describe(e.time).day - startDay + 1

export const entryClock = (e: JournalEntry) => formatClock(defaultCalendar.describe(e.time))

/**
 * The whole journal as Markdown, oldest first, a heading per day: for notes apps
 * (SilverBullet, Obsidian…) or to print. Day-start lines are left out (the heading says it).
 */
export function journalMarkdown(
  journal: readonly JournalEntry[],
  context: JournalContext,
  title: string,
): string {
  const lines = [`# ${title}`]
  let day: number | undefined
  for (const entry of journal) {
    if (entry.code === 'DAY_STARTED') continue
    const today = tripDay(entry, context.startDay)
    if (today !== day) {
      day = today
      lines.push('', `## ${context.t('journalDay', { day })}`, '')
    }
    const text = entryText(entry, context).replace(/\s*\n\s*/g, ' ')
    lines.push(`- **${entryClock(entry)}** ${entry.source === 'user' ? `_${text}_` : text}`)
  }
  return `${lines.join('\n')}\n`
}
