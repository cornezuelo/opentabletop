import {
  defaultCalendar,
  nextAt,
  type Calendar,
  type CalendarParts,
  type GameTime,
  type TimeParts,
} from '@open-tabletop/time'

/**
 * The world clock of a campaign: the time of the world, events scheduled on it (once or
 * repeating), progress clocks ("The Wyrm wakes: 3/6") and a timeline of what happened.
 * Headless and pure: `(state, action) → { state, events }`; the calendar only names the
 * time (days, months, moons, holidays).
 */

export interface ScheduledEvent {
  /**
   * How conditions, tables and plans name it (`world.events: market-day`): lowercase words
   * joined by dashes, unique among the world's events. Given when scheduling, or made from
   * its name.
   */
  id: string
  name: string
  /** A few words on what it is, for the player. */
  description?: string
  /** When it comes due (absolute game minutes). */
  at: GameTime
  /** Comes back every N days, or every year of the calendar. */
  repeat?: { days: number } | { yearly: true }
  /** A note path (the notes app), e.g. Factions/Iron Clans/Attack. */
  noteRef?: string
}

export interface ProgressClock {
  id: string
  name: string
  segments: number
  filled: number
  noteRef?: string
}

/** One line of the timeline: what happened, when. Codes are translated by the UI. */
export interface TimelineEntry {
  id: string
  time: GameTime
  /** `LOG`: a line another part of the campaign wrote (a world turn's result, with `data`). */
  code: 'EVENT' | 'HOLIDAY' | 'MOON' | 'CLOCK_FILLED' | 'CLOCK' | 'NOTE' | 'REWOUND' | 'LOG'
  text?: string
  data?: Record<string, unknown>
}

export interface WorldState {
  time: GameTime
  events: ScheduledEvent[]
  clocks: ProgressClock[]
  timeline: TimelineEntry[]
  nextId: number
}

export function initialWorld(time: GameTime = 0): WorldState {
  return { time, events: [], clocks: [], timeline: [], nextId: 1 }
}

/** How far to go. */
export type Until = 'dawn' | 'dusk' | 'next-day' | 'next-event'

export type WorldAction =
  | { type: 'advance'; minutes: number }
  | { type: 'advanceUntil'; until: Until }
  /** Moves the clock to a moment (forward only, living what comes on the way). */
  | { type: 'setTime'; time: GameTime }
  /**
   * Puts the clock back to an earlier moment (the host asks first). Nothing that happened
   * is undone: the timeline keeps it, and says the clock went back.
   */
  | { type: 'rewind'; time: GameTime }
  /** A new event; its `id` is the one given (if free and well written) or made from its name. */
  | { type: 'schedule'; event: Omit<ScheduledEvent, 'id'> & { id?: string } }
  /** Changes an event; a new `id` in the patch is taken only if free and well written. */
  | { type: 'updateEvent'; id: string; patch: Partial<ScheduledEvent> }
  | { type: 'cancel'; id: string }
  | { type: 'addClock'; clock: Omit<ProgressClock, 'id' | 'filled'> & { filled?: number } }
  | { type: 'updateClock'; id: string; patch: Partial<Omit<ProgressClock, 'id'>> }
  /** Fills (or empties, negative) segments of a clock. */
  | { type: 'tick'; id: string; segments: number }
  | { type: 'removeClock'; id: string }
  | { type: 'note'; text: string }
  /** A line of the timeline written by someone else (a faction's turn), at a moment or now. */
  | { type: 'log'; text: string; data?: Record<string, unknown>; time?: GameTime }

export type WorldEvent =
  | { type: 'TIME_ADVANCED'; from: GameTime; to: GameTime }
  | { type: 'TIME_REWOUND'; from: GameTime; to: GameTime }
  | { type: 'DAY_STARTED'; day: number; time: GameTime }
  | { type: 'EVENT_DUE'; event: ScheduledEvent; time: GameTime }
  | { type: 'HOLIDAY'; id: string; time: GameTime }
  | { type: 'MOON_PHASE'; moon: string; phase: string; time: GameTime }
  | { type: 'CLOCK_FILLED'; clock: ProgressClock }

export interface WorldOptions {
  calendar?: Calendar
  /** When the day starts and night falls (default the calendar's, else 06:00 / 20:00). */
  dawn?: string
  dusk?: string
}

/** Days are checked one by one up to this many when advancing (a year and a bit). */
const MAX_DAYS = 400

export function createWorld(options: WorldOptions = {}) {
  const calendar = options.calendar ?? defaultCalendar
  const def = (calendar as { def?: { dawn?: string; dusk?: string } }).def
  const dawn = options.dawn ?? def?.dawn ?? '06:00'
  const dusk = options.dusk ?? def?.dusk ?? '20:00'
  const day = (time: GameTime) => calendar.describe(time).day

  /** When a repeating event comes back after `at`. */
  const nextOccurrence = (event: ScheduledEvent): GameTime | undefined => {
    const repeat = event.repeat
    if (!repeat) return undefined
    if ('days' in repeat) return event.at + Math.max(1, repeat.days) * calendar.minutesPerDay
    const yearDays = (calendar as { yearDays?: number }).yearDays ?? 360
    return event.at + yearDays * calendar.minutesPerDay
  }

  /** What changes from one moment to a later one: days, holidays, moons, due events. */
  function pass(state: WorldState, to: GameTime, events: WorldEvent[]): void {
    const from = state.time
    if (to <= from) return
    // Due events, in order (a repeating one may come due several times).
    for (let guard = 0; guard < 1000; guard++) {
      const due = state.events
        .filter((e) => e.at > from && e.at <= to)
        .sort((a, b) => a.at - b.at)[0]
      if (!due) break
      events.push({ type: 'EVENT_DUE', event: due, time: due.at })
      log(state, { time: due.at, code: 'EVENT', text: due.name, data: { event: due.id } })
      const next = nextOccurrence(due)
      state.events = state.events
        .map((e) => (e.id === due.id && next !== undefined ? { ...e, at: next } : e))
        .filter((e) => e.id !== due.id || next !== undefined)
    }
    // Each new day: its holidays and the moons that changed phase.
    const first = day(from)
    const last = Math.min(day(to), first + MAX_DAYS)
    let before = calendar.describe(from)
    for (let d = first + 1; d <= last; d++) {
      const time = calendar.at(d, 0)
      const parts = calendar.describe(time)
      events.push({ type: 'DAY_STARTED', day: d, time })
      if (isData(parts)) {
        for (const h of parts.holidays) {
          events.push({ type: 'HOLIDAY', id: h.id, time })
          log(state, { time, code: 'HOLIDAY', data: { holiday: h.id } })
        }
        const was = isData(before) ? before.moons : []
        for (const moon of parts.moons) {
          const old = was.find((m) => m.id === moon.id)?.phase
          if (old && old !== moon.phase) {
            events.push({ type: 'MOON_PHASE', moon: moon.id, phase: moon.phase, time })
            if (moon.phase === 'full' || moon.phase === 'new')
              log(state, { time, code: 'MOON', data: { moon: moon.id, phase: moon.phase } })
          }
        }
      }
      before = parts
    }
    state.time = to
    events.push({ type: 'TIME_ADVANCED', from, to })
  }

  function log(state: WorldState, entry: Omit<TimelineEntry, 'id'>): void {
    state.timeline = [...state.timeline, { id: `w${state.nextId++}`, ...entry }]
  }

  /** The moment `until` names, from now. */
  function target(state: WorldState, until: Until): GameTime | undefined {
    const now = state.time
    if (until === 'dawn') return nextAt(calendar, now + 1, dawn)
    if (until === 'dusk') return nextAt(calendar, now + 1, dusk)
    if (until === 'next-day') return calendar.at(day(now) + 1, 0)
    const next = state.events.filter((e) => e.at > now).sort((a, b) => a.at - b.at)[0]
    return next?.at
  }

  function apply(
    input: WorldState,
    action: WorldAction,
  ): { state: WorldState; events: WorldEvent[] } {
    const state = structuredClone(input)
    const events: WorldEvent[] = []
    switch (action.type) {
      case 'advance':
        pass(state, state.time + Math.max(0, action.minutes), events)
        break
      case 'advanceUntil': {
        const to = target(state, action.until)
        if (to !== undefined) pass(state, to, events)
        break
      }
      case 'setTime':
        pass(state, action.time, events)
        break
      case 'rewind': {
        const to = Math.max(0, action.time)
        if (to >= state.time) break
        const from = state.time
        state.time = to
        log(state, { time: to, code: 'REWOUND', data: { from } })
        events.push({ type: 'TIME_REWOUND', from, to })
        break
      }
      case 'schedule': {
        const taken = new Set(state.events.map((e) => e.id))
        const given = action.event.id?.trim()
        const id =
          given && isEventId(given) && !taken.has(given)
            ? given
            : freeId(factId(action.event.name) || `e${state.nextId}`, taken)
        state.nextId++
        state.events = [...state.events, { ...action.event, id }]
        break
      }
      case 'updateEvent': {
        const { id: wanted, ...patch } = action.patch as Partial<ScheduledEvent>
        const free =
          wanted !== undefined &&
          wanted !== action.id &&
          isEventId(wanted) &&
          !state.events.some((e) => e.id === wanted)
        state.events = state.events.map((e) =>
          e.id === action.id ? { ...e, ...patch, id: free ? wanted : e.id } : e,
        )
        break
      }
      case 'cancel':
        state.events = state.events.filter((e) => e.id !== action.id)
        break
      case 'addClock': {
        const segments = Math.max(1, Math.round(action.clock.segments))
        state.clocks = [
          ...state.clocks,
          {
            ...action.clock,
            id: `c${state.nextId++}`,
            segments,
            filled: clamp(action.clock.filled ?? 0, segments),
          },
        ]
        break
      }
      case 'updateClock':
        state.clocks = state.clocks.map((c) => {
          if (c.id !== action.id) return c
          const next = { ...c, ...action.patch, id: c.id }
          next.segments = Math.max(1, Math.round(next.segments))
          next.filled = clamp(next.filled, next.segments)
          return next
        })
        break
      case 'tick': {
        const clock = state.clocks.find((c) => c.id === action.id)
        if (!clock) break
        const filled = clamp(clock.filled + action.segments, clock.segments)
        if (filled === clock.filled) break
        const next = { ...clock, filled }
        state.clocks = state.clocks.map((c) => (c.id === clock.id ? next : c))
        log(state, {
          time: state.time,
          code: 'CLOCK',
          text: clock.name,
          data: { clock: clock.id, filled, segments: clock.segments },
        })
        if (filled === clock.segments && clock.filled < clock.segments) {
          events.push({ type: 'CLOCK_FILLED', clock: next })
          log(state, {
            time: state.time,
            code: 'CLOCK_FILLED',
            text: clock.name,
            data: { clock: clock.id },
          })
        }
        break
      }
      case 'removeClock':
        state.clocks = state.clocks.filter((c) => c.id !== action.id)
        break
      case 'note':
        if (action.text.trim())
          log(state, { time: state.time, code: 'NOTE', text: action.text.trim() })
        break
      case 'log':
        log(state, {
          time: action.time ?? state.time,
          code: 'LOG',
          text: action.text,
          ...(action.data && { data: action.data }),
        })
        break
    }
    return { state, events }
  }

  /** Events still to come, soonest first. */
  const upcoming = (state: WorldState, limit = 10) =>
    state.events
      .filter((e) => e.at > state.time)
      .sort((a, b) => a.at - b.at)
      .slice(0, limit)

  return { calendar, apply, upcoming, target }
}

export type World = ReturnType<typeof createWorld>

const clamp = (n: number, max: number) => Math.min(max, Math.max(0, Math.round(n)))

function isData(parts: TimeParts | CalendarParts): parts is CalendarParts {
  return 'month' in parts
}

/** Saved world state with any broken part reset (hand-edited files, older saves). */
export function readWorld(raw: unknown): WorldState {
  const r = (typeof raw === 'object' && raw !== null ? raw : {}) as Partial<WorldState>
  const num = (v: unknown, fallback: number) =>
    typeof v === 'number' && Number.isFinite(v) ? v : fallback
  const list = <T>(v: unknown, ok: (item: Record<string, unknown>) => boolean): T[] =>
    Array.isArray(v)
      ? (v.filter(
          (x) => typeof x === 'object' && x !== null && ok(x as Record<string, unknown>),
        ) as T[])
      : []
  return {
    time: Math.max(0, num(r.time, 0)),
    events: list<ScheduledEvent>(
      r.events,
      (e) => typeof e.id === 'string' && typeof e.name === 'string' && typeof e.at === 'number',
    ),
    clocks: list<ProgressClock>(
      r.clocks,
      (c) =>
        typeof c.id === 'string' &&
        typeof c.name === 'string' &&
        typeof c.segments === 'number' &&
        typeof c.filled === 'number',
    ),
    timeline: list<TimelineEntry>(
      r.timeline,
      (t) => typeof t.id === 'string' && typeof t.time === 'number' && typeof t.code === 'string',
    ),
    nextId: Math.max(1, num(r.nextId, 1)),
  }
}

/** Whether a text is an event id as conditions write it: lowercase words joined by dashes. */
export const isEventId = (text: string): boolean => /^[a-z0-9]+(-[a-z0-9]+)*$/.test(text)

/** `id`, or `id-2`, `id-3`… the first one not taken. */
function freeId(id: string, taken: Set<string>): string {
  if (!taken.has(id)) return id
  for (let n = 2; ; n++) if (!taken.has(`${id}-${n}`)) return `${id}-${n}`
}

/** A name as conditions write it: lowercase, words joined by dashes (`The Wyrm wakes` → `the-wyrm-wakes`). */
export const factId = (name: string): string =>
  name
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

/**
 * What tables and conditions read of the world, by names written as ids (`factId`): each
 * progress clock's filled segments (`clocks.the-wyrm-wakes: 3`) and the events that fall
 * on the current day, due or already come (`events: [market-day]`).
 */
export function worldFacts(state: WorldState, calendar: Calendar): Record<string, unknown> {
  const { day } = calendar.describe(state.time)
  const from = calendar.at(day, '00:00')
  const to = calendar.at(day + 1, '00:00')
  const today = (time: GameTime) => time >= from && time < to
  // Each event by its id and by its name written as one (older events have ids like `e3`).
  const byId = new Map(state.events.map((e) => [e.id, e]))
  const names = (id: unknown, name: string | undefined): string[] => [
    ...(typeof id === 'string' ? [id] : []),
    factId(byId.get(id as string)?.name ?? name ?? ''),
  ]
  const events = [
    ...state.events.filter((e) => today(e.at)).flatMap((e) => names(e.id, e.name)),
    ...state.timeline
      .filter((t) => t.code === 'EVENT' && today(t.time))
      .flatMap((t) => names(t.data?.event, t.text)),
  ]
  return {
    clocks: Object.fromEntries(state.clocks.map((c) => [factId(c.name), c.filled])),
    events: [...new Set(events.filter(Boolean))],
  }
}
