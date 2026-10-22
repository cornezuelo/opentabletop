import {
  FACT_PATHS,
  MEMBER_PATH,
  localize,
  shownAt,
  tripChanges,
  type JournalEntry,
  type JournalLevel,
  type JournalTopic,
  type RolledNode,
} from '@open-tabletop/session'
import {
  availableActions,
  DAY_END,
  HEX_ENTER,
  momentsOf,
  ref,
  type TravelRules,
  type Unavailable,
} from '@open-tabletop/travel-engine'
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
  /**
   * The values of the day the system declares, by id with their names (`lost: 'Lost'`).
   */
  dayValues?: Record<string, string>
  /**
   * A member's value or condition in words (`characters.kael.values.health` → "Kael:
   * Health", `party.members.…` → everyone's, `acting.…` → whoever acts), when the system's
   * party is made of characters.
   */
  memberName?: (path: string) => string | undefined
  /** A text of the system's own (a `say:`, a `pause:`) in the UI's language. */
  textOf?: (text: unknown) => string
  /** Name of one of the system's ways of travelling. */
  modeName?: (id: string) => string
  /** An action's parameter as a question (`ask:`), and one of its choices, in words. */
  paramName?: (action: string, param: string) => string
  choiceName?: (action: string, param: string, choice: string) => string
  /** A part of the calendar's day by its reference (`time.meals.supper`), in words. */
  partName?: (ref: string) => string | undefined
}

/** A text of the system's own as written: alone, or the first of its languages. */
const firstText = (text: unknown): string =>
  typeof text === 'string'
    ? text
    : typeof text === 'object' && text !== null
      ? String(Object.values(text)[0] ?? '')
      : ''

/** Whether an effect's path is about the party's characters. */
/** Whether an effect's path is about characters, or the world (factions, clocks): named apart. */
const isMemberPath = (path: string) =>
  MEMBER_PATH.test(path) || /^(factions\.[^.]+|world\.clocks)\./.test(path)

/** Minutes as "3 h", "1 h 30" or "45 min". */
export function durationText(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = Math.round(minutes % 60)
  if (!h) return `${m} min`
  return m ? `${h} h ${String(m).padStart(2, '0')}` : `${h} h`
}

/** One pair of a condition that stopped something, as the engine tells it. */
interface FailedPair {
  path: string
  value: unknown
  op: string
  asked: unknown
  negated?: boolean
}

/** The facts a condition reads most, named for players (the rest by their path). */
const FACT_NAMES = new Set([
  'trip.marched',
  'trip.weather',
  'trip.mode',
  'trip.edges',
  'time.hour',
  'time.tags',
  'time.part',
  'time.season',
  'hex.terrain',
  'hex.danger',
  'hex.tags',
])

/**
 * Which pairs of a condition stopped something, readably: "the hour is 21:00: it needs
 * under 20:00; By torchlight doesn't hold". Each by its fact's name (a stat, a supply or a
 * value of the day by the system's), what it read and what it asked.
 */
export function failedText(
  failed: readonly FailedPair[],
  {
    t,
    valueName,
    dayValues,
    terrainName,
  }: Pick<JournalContext, 't' | 'valueName' | 'dayValues' | 'terrainName'>,
): string {
  const full = (path: string) => FACT_PATHS[path] ?? path
  const nameOf = (path: string): string => {
    const p = full(path)
    const [, scope, id] = /^(party\.stats|party\.resources|today|yesterday)\.(.+)$/.exec(p) ?? []
    if (scope === 'today') return dayValues?.[id] ?? id
    if (scope === 'yesterday') return t('why.yesterday', { name: dayValues?.[id] ?? id })
    if (scope) return valueName?.(id) ?? id
    if (FACT_NAMES.has(p)) return t(`why.facts.${p.replace('.', '_')}` as TravelUiKey)
    // A value of the day written short (`lost`): by the system's name.
    if (dayValues?.[p]) return dayValues[p]
    return `\`${path}\``
  }
  const valueText = (path: string, v: unknown): string => {
    if (v === undefined || v === null) return t('why.nothing')
    if (Array.isArray(v))
      return v.length ? v.map((x) => valueText(path, x)).join(', ') : t('why.nothing')
    if (typeof v === 'boolean') return t(v ? 'why.yes' : 'why.no')
    if (typeof v === 'number' && full(path) === 'time.hour') {
      const minutes = Math.round(v * 60)
      return formatClock({ hour: Math.floor(minutes / 60), minute: minutes % 60 })
    }
    if (typeof v === 'string' && full(path) === 'hex.terrain') return terrainName?.(v) ?? v
    // Hours marched and the like, to two decimals at most (8.01, not 8.01111111111095).
    if (typeof v === 'number') return String(Math.round(v * 100) / 100)
    return String(v)
  }
  return failed
    .map(({ path, value, op, asked, negated }) => {
      const name = nameOf(path)
      // A yes-or-no value (a value of the day, a condition): whether it holds.
      if (op === 'eq' && typeof asked === 'boolean') {
        const holdsNow = negated ? asked : !asked
        return t(holdsNow ? 'why.holds' : 'why.unset', { name })
      }
      const params = { name, value: valueText(path, value), asked: valueText(path, asked) }
      return negated ? t('why.is', params) : t(`why.op.${op}` as TravelUiKey, params)
    })
    .join('; ')
}

/** Why something can't be done now, in words ('' when the system simply has no such thing). */
export function whyText(
  because: Unavailable | undefined,
  context: Pick<JournalContext, 't' | 'dayValues' | 'memberName' | 'valueName' | 'terrainName'>,
): string {
  const { t, dayValues, memberName } = context
  if (!because || 'off' in because) return ''
  if ('pending' in because) return t('blocked.pending')
  if ('held' in because) return t('blocked.held')
  // A member's condition: who has it, until it's cleared.
  if ('value' in because && because.who !== undefined)
    return t('blocked.member', {
      name:
        memberName?.(
          because.who === 'party'
            ? `party.conditions.${because.value}`
            : `characters.${because.who}.conditions.${because.value}`,
        ) ?? `${because.who}: ${because.value}`,
    })
  if ('value' in because)
    return t('blocked.value', {
      name: dayValues?.[because.value] ?? idText(t, `values.${because.value}`, because.value),
    })
  if ('once' in because) return t('blocked.once')
  // Its rule, and which of its pairs stopped it.
  if ('failed' in because && because.failed?.length)
    return t('blocked.conditionWhy', { why: failedText(because.failed, context) })
  return t('blocked.condition')
}

const signed = (n: number) => (n > 0 ? `+${n}` : `−${-n}`)

/**
 * What a check's result changed, for its journal line: "Food +2, Morale −1, lost for
 * today" (weather is left out: the result's text already says it).
 */
export function changesText(
  value: Record<string, unknown>,
  {
    t,
    valueName,
    dayValues,
    memberName,
  }: Pick<JournalContext, 't' | 'valueName' | 'dayValues' | 'memberName'>,
): string {
  // Effects are by path (party.stats.morale): named by the value's id.
  const id = (path: string) =>
    path.replace(/^party\.(stats|resources)\./, '').replace(/^party\./, '')
  const name = (path: string) =>
    isMemberPath(path)
      ? (memberName?.(path) ?? path)
      : valueName
        ? valueName(id(path))
        : idText(t, `resources.${id(path)}`, id(path))
  const parts = tripChanges(value)
    // Weather is told by the result; what a party without characters can't feel, not at all.
    .filter(([path]) => path !== 'weather' && (!isMemberPath(path) || !!memberName?.(path)))
    .flatMap(([path, change]) =>
      // A character's condition set, or cleared.
      change === 'true'
        ? [name(path)]
        : change === 'false'
          ? [t('journal.cleared', { name: name(path) })]
          : typeof change === 'number'
            ? change !== 0
              ? [`${name(path)} ${signed(change)}`]
              : []
            : typeof change === 'string' && change.startsWith('=')
              ? [`${name(path)} ${change}`]
              : [],
    )
  // Values of the day the result sets (lost…), by the system's name.
  for (const [id, name] of Object.entries(dayValues ?? {}))
    if (value[id] !== undefined && value[id] !== false && value[id] !== null) parts.push(name)
  return parts.join(', ')
}

/**
 * A check event for players: the name of what a step rolled (`named`, for `roll: table.x`),
 * the system's name for it, a known one, or the id made readable.
 */
export const eventName = (
  t: Translate,
  event: unknown,
  checkName?: JournalContext['checkName'],
  named?: unknown,
) =>
  (typeof named === 'string' ? named : undefined) ??
  checkName?.(String(event)) ??
  idText(t, `events.${String(event)}`, String(event))

/**
 * What an action that rolled nothing says (`actionNothing`): its own text (`nothing`, with
 * `{terrain}`), '' when no check is rolled at it (nothing to say), undefined for the generic.
 */
export function actionNothingOf(
  rules: TravelRules,
  id: string,
  locale: string,
): string | undefined {
  const at = ref('actions', id)
  if (!(rules.checks ?? []).some((c) => momentsOf(c.at).includes(at))) return ''
  return localize(availableActions(rules).all[id]?.nothing, locale, 'en')
}

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
      const changed =
        typeof d.effects === 'object' && d.effects !== null
          ? changesText({ effects: d.effects }, context)
          : ''
      const told = changed ? `${done} (${changed})` : done
      if (d.checks !== 0) return told
      const own = context.actionNothing?.(id)
      if (own === '') return told
      const terrain =
        typeof d.terrain === 'string'
          ? (context.terrainName?.(d.terrain) ?? d.terrain.replaceAll('-', ' '))
          : hexLabel(String(d.hex))
      const nothing = own
        ? own.replaceAll('{terrain}', terrain)
        : t('journal.actionNothing', { terrain })
      return `${told}: ${nothing}`
    }
    // Older journals: camp and rest had lines of their own.
    case 'CAMP_STARTED': {
      const camped = t('journal.CAMP_STARTED')
      const changed =
        typeof d.effects === 'object' && d.effects !== null
          ? changesText({ effects: d.effects }, context)
          : ''
      return changed ? `${camped} (${changed})` : camped
    }
    case 'RESTED': {
      const rested = t('journal.rested', { length: durationText(Number(d.minutes) || 0) })
      const changed =
        typeof d.effects === 'object' && d.effects !== null
          ? changesText({ effects: d.effects }, context)
          : ''
      return changed ? `${rested} (${changed})` : rested
    }
    // Older journals (supplies are an action's effects now).
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
      const line = `${eventName(t, d.event, checkName, d.named)}: ${e.text ?? '—'}`
      const value = d.value
      const changes =
        typeof value === 'object' && value !== null
          ? changesText(value as Record<string, unknown>, context)
          : ''
      return changes ? `${line} (${changes})` : line
    }
    case 'CHECK_EFFECTS': {
      const changed = changesText({ effects: d.effects }, context)
      return `${eventName(t, d.event, checkName, d.named)}${changed ? `: ${changed}` : ''}`
    }
    case 'ORACLE_ROLL':
      return `${nameOf(String(d.table))}: ${e.text ?? '—'}`
    case 'CHECK_NOTED':
      return eventName(t, d.event, checkName, d.named)
    // A check that waits for the player, and the hex it came up in.
    case 'CHECK_PENDING':
    case 'CHECK_PAUSED':
    case 'CHECK_ASKS': {
      const key = { CHECK_PENDING: 'pending', CHECK_PAUSED: 'paused', CHECK_ASKS: 'asks' }[e.code]
      const name = eventName(t, d.event, checkName, d.named)
      const event = d.hex
        ? t('journal.eventAt', { event: name, hex: hexLabel(String(d.hex)) })
        : name
      return t(`journal.${key}` as TravelUiKey, { event })
    }
    // A step's line of the system's own.
    case 'SAID':
      return (context.textOf ?? firstText)(d.text)
    // A step that stops the trip for the player: what it says, or what it asks.
    case 'HELD': {
      const w = (d.waiting ?? {}) as { action?: string; text?: unknown; ask?: string }
      const action = actionText(String(w.action))
      if (w.ask)
        return t('journal.heldAsk', {
          action,
          question: context.paramName?.(String(w.action), w.ask) ?? w.ask,
        })
      if (w.text !== undefined)
        return t('journal.heldSays', { action, text: (context.textOf ?? firstText)(w.text) })
      return t('journal.held', { action })
    }
    case 'RESUMED': {
      const action = String(d.action)
      if (typeof d.ask === 'string')
        return t('journal.chosen', {
          question: context.paramName?.(action, d.ask) ?? d.ask,
          choice: context.choiceName?.(action, d.ask, String(d.choice)) ?? String(d.choice),
        })
      return t('journal.resumed', { action: actionText(action) })
    }
    case 'MODE_CHANGED':
      return t('journal.modeChanged', {
        mode: context.modeName?.(String(d.mode)) ?? String(d.mode).replaceAll('-', ' '),
      })
    case 'DISCOVERY_FAILED':
      return t('journal.discoveryFailed', { hex: hexLabel(String(d.hex)), error: e.text ?? '' })
    case 'CHECK_FAILED':
      return t('journal.failed', {
        event: eventName(t, d.event, checkName, d.named),
        error: e.text ?? '',
      })
    case 'HEX_ENTERED':
      return t('journal.entered', { hex: hexLabel(String(d.hex)) })
    case 'HEX_DISCOVERED':
      return t('journal.discovered', { hex: hexLabel(String(d.hex)), what: e.text ?? '—' })
    case 'DAY_STARTED':
      return t('journal.day', { day: Number(d.day) - startDay + 1 })
    case 'LIMIT_REACHED': {
      const path = String(d.path)
      const key = path.replace(/^party\.(stats|resources)\./, '')
      return t(d.limit === 'max' ? 'journal.limitMax' : 'journal.limitMin', {
        name: isMemberPath(path) ? (context.memberName?.(path) ?? path) : name(key),
        value: Number(d.value),
      })
    }
    // Older journals: a day of supplies eaten, or one running out.
    case 'RESOURCE_DEPLETED':
      return t('journal.depleted', { resource: name(String(d.resource)) })
    case 'WAIT': {
      const until = Number(d.until)
      const parts = (context.calendar ?? defaultCalendar).describe(until)
      return t('journal.wait', { day: parts.day - startDay + 1, clock: formatClock(parts) })
    }
    case 'HALT_WITHOUT':
      return t('journal.haltWithout', {
        action: actionText(String(d.action)),
        why: whyText(d.because as Unavailable | undefined, context).replace(/\.$/, ''),
      })
    // Older journals: a night that passed without the night's action.
    case 'NIGHT_WITHOUT':
      return t('journal.nightWithout', {
        action: actionText(String(d.action)),
        // Inside brackets: without its full stop.
        why: whyText(d.because as Unavailable | undefined, context).replace(/\.$/, ''),
      })
    // Older journals: a wait stopped at a night that couldn't be camped.
    case 'TRAVEL_STOPPED':
      if (d.reason === 'camp')
        return t('stop.camp', {
          // Older entries didn't say which action: it was camp.
          action: actionText(String(d.action ?? 'camp')),
          why: whyText(d.because as Unavailable | undefined, context).replace(/\.$/, ''),
        })
      // A member's condition that blocks travel: who has it.
      if (d.reason === 'value' && typeof d.who === 'string')
        return t('stop.member', {
          name:
            context.memberName?.(`characters.${d.who}.conditions.${String(d.value)}`) ??
            `${d.who}: ${String(d.value)}`,
        })
      // A moving action whose conditions stopped holding: which.
      if (d.reason === 'conditions') {
        const because = d.because as { failed?: FailedPair[] } | undefined
        return because?.failed?.length
          ? t('stop.conditionsWhy', {
              action: actionText(String(d.action)),
              why: failedText(because.failed, context),
            })
          : t('stop.conditions', { action: actionText(String(d.action)) })
      }
      // A value that leaves the way of travelling behind: another way can go on.
      if (d.reason === 'value' && typeof d.mode === 'string')
        return t('stop.mode', {
          name:
            context.dayValues?.[String(d.value)] ?? idText(t, `values.${d.value}`, String(d.value)),
          mode: context.modeName?.(d.mode) ?? d.mode.replaceAll('-', ' '),
        })
      if (d.reason === 'value')
        return t('stop.value', {
          name:
            context.dayValues?.[String(d.value)] ?? idText(t, `values.${d.value}`, String(d.value)),
        })
      return t(`stop.${String(d.reason)}` as TravelUiKey)
    case 'NOBODY_ACTING':
      return t('journal.nobodyActing', {
        name: context.memberName?.(String(d.path)) ?? String(d.path),
      })
    case 'NOTE':
      return e.text ?? ''
    case 'ROSTER_UPDATED':
      return t('journal.rosterUpdated', {
        names: Array.isArray(d.names) ? d.names.join(', ') : '',
      })
    case 'WORLD_EVENT':
      return t('journal.worldEvent', { name: e.text ?? '' })
    case 'HOLIDAY':
      return t('journal.holiday', { name: e.text ?? '' })
    case 'CLOCK_FILLED':
      return t('journal.clockFilled', { name: e.text ?? '' })
    // The journal's detail: what happened behind.
    case 'ROLLED': {
      const rolls = Array.isArray(d.rolls) ? (d.rolls as RolledNode[]) : []
      return t('journal.rolled', {
        event: eventName(t, d.check, checkName, d.named),
        rolls: rolls
          .map((r) => {
            const chose = r.entry !== undefined ? ` → ${r.entry}` : ''
            const dice = r.dice.length ? `: ${r.dice.join(', ')}` : ''
            return `${nameOf(r.source)}${dice}${chose}`
          })
          .join('; '),
      })
    }
    case 'WEATHER_ROLLED': {
      const weather = String(d.weather).replaceAll('-', ' ')
      const how =
        typeof d.total === 'number'
          ? t('journal.weatherFlower', {
              total: d.total,
              move: t(`journal.moves.${String(d.move)}` as TravelUiKey),
            })
          : typeof d.from === 'string'
            ? t('journal.weatherFrom', { from: d.from.replaceAll('-', ' ') })
            : t('journal.weatherStart')
      return t('journal.weatherRolled', {
        event: eventName(t, d.check, checkName, d.named),
        how,
        weather,
      })
    }
    case 'CHANGED': {
      const path = String(d.path)
      const key = path.replace(/^party\.(stats|resources)\./, '')
      const who = isMemberPath(path) ? (context.memberName?.(path) ?? path) : name(key)
      // A condition set or cleared (0 and 1).
      if (/\.conditions\./.test(path))
        return t(Number(d.to) ? 'journal.conditionSet' : 'journal.conditionCleared', { name: who })
      return t('journal.changed', { name: who, from: Number(d.from), to: Number(d.to) })
    }
    case 'CHECK_SKIPPED': {
      const failed = Array.isArray(d.failed) ? (d.failed as FailedPair[]) : []
      return t('journal.skipped', {
        event: eventName(t, d.check, checkName, d.named),
        why: failed.length
          ? failedText(failed, context)
          : t(`journal.skippedBy.${d.condition === 'unless' ? 'unless' : 'when'}`),
      })
    }
    case 'MOMENT_REACHED':
      return t('journal.moment', { moment: momentText(String(d.at), context) })
    case 'ROUTE_PLANNED':
      return t('journal.route', { hex: hexLabel(String(d.to)), hexes: Number(d.hexes) })
    default:
      return idText(t, `journal.${e.code}`, e.code)
  }
}

/**
 * A moment of the day, in words: a part of the calendar's day by its name, an action
 * taken, entering a hex, the day's end, or a clock as it's written.
 */
export function momentText(
  at: string,
  { t, actionName, partName }: Pick<JournalContext, 't' | 'actionName' | 'partName'>,
): string {
  if (at === HEX_ENTER) return t('journal.moments.hexEnter')
  if (at === DAY_END) return t('journal.moments.dayEnd')
  const action = /^actions\.(.+)$/.exec(at)?.[1]
  if (action)
    return t('journal.moments.action', {
      action: actionName?.(action) ?? idText(t, `actions.${action}`, action),
    })
  return partName?.(at) ?? at
}

/** What a journal shows: up to a level, of some topics, with a text in its lines. */
export interface JournalFilter {
  level: JournalLevel
  /** None: every topic. */
  topics?: readonly JournalTopic[]
  /** Words its lines must have (any case); empty: any line. */
  search?: string
}

/** The entries a filter lets through, in their order. */
export function filterJournal(
  journal: readonly JournalEntry[],
  filter: JournalFilter,
  context: JournalContext,
): JournalEntry[] {
  const words = (filter.search ?? '').trim().toLocaleLowerCase()
  return journal.filter(
    (e) =>
      shownAt(e, filter) && (!words || entryText(e, context).toLocaleLowerCase().includes(words)),
  )
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
