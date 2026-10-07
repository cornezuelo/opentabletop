import { tripChanges, type JournalEntry } from '@open-tabletop/session'
import { defaultCalendar, formatClock, type Calendar } from '@open-tabletop/time'
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
  /** Name the system gives a check event, if any. */
  checkName?: (event: string) => string | undefined
  /** The system's calendar (the default one if absent). */
  calendar?: Calendar
  /** Name of a value results change: a resource, a stat, `fatigue`. */
  valueName?: (key: string) => string
  /** Name of a terrain id (forest…). */
  terrainName?: (id: string) => string
  /**
   * When an action of the system's own rolled nothing where it was taken: the system's
   * text for it (`nothing`), `''` if it has no checks at all (nothing to say), or
   * undefined for the generic text.
   */
  actionNothing?: (id: string) => string | undefined
}

/** Minutes as "3 h", "1 h 30" or "45 min". */
export function durationText(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = Math.round(minutes % 60)
  if (!h) return `${m} min`
  return m ? `${h} h ${String(m).padStart(2, '0')}` : `${h} h`
}

const signed = (n: number) => (n > 0 ? `+${n}` : `−${-n}`)

/**
 * What a check's result changed, for its journal line: "Food +2, Morale −1, lost for
 * today" (weather is left out: the result's text already says it).
 */
export function changesText(
  value: Record<string, unknown>,
  { t, valueName }: Pick<JournalContext, 't' | 'valueName'>,
): string {
  const name = valueName ?? ((key: string) => idText(t, `resources.${key}`, key))
  const parts = tripChanges(value)
    .filter((c): c is [string, number] => typeof c[1] === 'number' && c[1] !== 0)
    .map(([key, change]) => `${name(key)} ${signed(change)}`)
  if (value.lost === true) parts.push(t('journal.lostToday'))
  return parts.join(', ')
}

/** A check event for players: the system's name for it, a known one, or the id made readable. */
export const eventName = (t: Translate, event: unknown, checkName?: JournalContext['checkName']) =>
  checkName?.(String(event)) ?? idText(t, `events.${String(event)}`, String(event))

/** One journal entry as a line of text in the UI language. */
export function entryText(e: JournalEntry, context: JournalContext) {
  const { t, startDay, hexLabel, nameOf, actionName, checkName } = context
  const d = (e.data ?? {}) as Record<string, unknown>
  const name = context.valueName ?? ((key: string) => idText(t, `resources.${key}`, key))
  const actionText = (id: string) => actionName?.(id) ?? idText(t, `actions.${id}`, id)
  switch (e.code) {
    case 'ACTION_TAKEN': {
      const id = String(d.action)
      const minutes = Number(d.minutes) || 0
      const done = minutes ? `${actionText(id)} (${durationText(minutes)})` : actionText(id)
      if (d.checks !== 0) return done
      const own = context.actionNothing?.(id)
      if (own === '') return done
      const terrain =
        typeof d.terrain === 'string'
          ? (context.terrainName?.(d.terrain) ?? d.terrain.replaceAll('-', ' '))
          : hexLabel(String(d.hex))
      const nothing = own
        ? own.replaceAll('{terrain}', terrain)
        : t('journal.actionNothing', { terrain })
      return `${done}: ${nothing}`
    }
    case 'RESTED':
      return t('journal.rested', { length: durationText(Number(d.minutes) || 0) })
    case 'SUPPLIES_USED': {
      const used = (d.used ?? {}) as Record<string, number>
      const left = (d.left ?? {}) as Record<string, number>
      const list = Object.entries(used)
        .map(([key, n]) => t('journal.used', { name: name(key), n, left: left[key] ?? 0 }))
        .join(', ')
      return t('journal.supplies', { list })
    }
    case 'FATIGUE_CHANGED': {
      const reason =
        d.reason === 'action'
          ? actionText(String(d.action))
          : t(`journal.fatigueReasons.${String(d.reason)}` as TravelUiKey)
      return t('journal.fatigue', {
        reason,
        change: signed(Number(d.change)),
        fatigue: Number(d.fatigue),
      })
    }
    case 'ORACLE_RESULT': {
      const line = `${eventName(t, d.event, checkName)}: ${e.text ?? '—'}`
      const value = d.value
      const changes =
        typeof value === 'object' && value !== null
          ? changesText(value as Record<string, unknown>, context)
          : ''
      return changes ? `${line} (${changes})` : line
    }
    case 'ORACLE_ROLL':
      return `${nameOf(String(d.table))}: ${e.text ?? '—'}`
    case 'CHECK_PENDING':
      return t('journal.pending', { event: eventName(t, d.event, checkName) })
    case 'DISCOVERY_FAILED':
      return t('journal.discoveryFailed', { hex: hexLabel(String(d.hex)), error: e.text ?? '' })
    case 'CHECK_FAILED':
      return t('journal.failed', { event: eventName(t, d.event, checkName), error: e.text ?? '' })
    case 'HEX_ENTERED':
      return t('journal.entered', { hex: hexLabel(String(d.hex)) })
    case 'HEX_DISCOVERED':
      return t('journal.discovered', { hex: hexLabel(String(d.hex)), what: e.text ?? '—' })
    case 'DAY_STARTED':
      return t('journal.day', { day: Number(d.day) - startDay + 1 })
    case 'RESOURCE_DEPLETED':
      return t('journal.depleted', { resource: name(String(d.resource)) })
    case 'TRAVEL_STOPPED':
      return t(`stop.${String(d.reason)}` as TravelUiKey)
    case 'NOTE':
      return e.text ?? ''
    case 'WORLD_EVENT':
      return t('journal.worldEvent', { name: e.text ?? '' })
    case 'HOLIDAY':
      return t('journal.holiday', { name: e.text ?? '' })
    default:
      return idText(t, `journal.${e.code}`, e.code)
  }
}

/** The trip day an entry belongs to (1 = the day the trip started). */
export const tripDay = (e: JournalEntry, startDay: number, calendar: Calendar = defaultCalendar) =>
  calendar.describe(e.time).day - startDay + 1

export const entryClock = (e: JournalEntry, calendar: Calendar = defaultCalendar) =>
  formatClock(calendar.describe(e.time))

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
    const today = tripDay(entry, context.startDay, context.calendar)
    if (today !== day) {
      day = today
      lines.push('', `## ${context.t('journalDay', { day })}`, '')
    }
    const text = entryText(entry, context).replace(/\s*\n\s*/g, ' ')
    lines.push(
      `- **${entryClock(entry, context.calendar)}** ${entry.source === 'user' ? `_${text}_` : text}`,
    )
  }
  return `${lines.join('\n')}\n`
}
