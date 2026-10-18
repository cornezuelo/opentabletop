import { MINUTES_PER_HOUR, parseClock } from './index'

/** Text in one or several languages: "Thaw" or { en: Thaw, es: Deshielo }. */
type Text = string | Record<string, string>

/** A part of a division of the day as a calendar writes it: `{ id: elevenses, from: '11:00' }`. */
export interface DayPartDef {
  id: string
  /** When it starts (`HH:MM`); it lasts until the next part of the day starts. */
  from: string
  /** When it ends, if before the next part starts: a gap with none of the division's parts. */
  until?: string
  name?: Text
  description?: Text
  /** Words a system may read (`dark`, `meal`…): none means anything to the engine. */
  tags?: string[]
}

/**
 * A way of dividing the day, as a calendar declares it (`divisions: { meal: … }`): its
 * parts, or numbered parts of equal length (`every: 4`, hours from midnight: 1, 2, 3…).
 */
export interface DivisionDef {
  name?: Text
  description?: Text
  parts?: DayPartDef[]
  every?: number
}

/** A part as the calendar reads it: minutes of the day, `until` within 0..day+from. */
export interface DayPart {
  id: string
  /** Minutes since midnight it starts at. */
  from: number
  /** Minutes since midnight it ends at (absent: when the next part starts). */
  until?: number
  name?: Text
  description?: Text
  tags: string[]
}

/** A division of the day, ready to read: its id, its parts in order of the day. */
export interface Division {
  id: string
  name?: Text
  description?: Text
  /** Numbered parts of equal length (`every`): its value is a number, not an id. */
  numbered: boolean
  parts: DayPart[]
}

/**
 * Names the moment already has: a division can't take them (`time.<division>` would hide
 * them). `tags` is the parts' tags.
 */
export const RESERVED_DIVISIONS = [
  'day',
  'hour',
  'minute',
  'minuteOfDay',
  'season',
  'daylight',
  'year',
  'month',
  'monthDay',
  'weekday',
  'moons',
  'holidays',
  'tags',
  'divisions',
  'dawn',
  'nightfall',
  'hoursPerDay',
] as const

const CLOCK = /^\d{1,2}:\d{2}$/
const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

/** Readable problems of a calendar's `divisions` (and its older `watchHours`). */
export function validateDivisions(
  divisions: unknown,
  watchHours: unknown,
  hoursPerDay = 24,
): string[] {
  const errors: string[] = []
  const minutesPerDay = hoursPerDay * MINUTES_PER_HOUR
  if (divisions === undefined) return errors
  if (!isRecord(divisions)) return ['divisions: a map of divisions (`meal: { parts: […] }`)']
  if (watchHours !== undefined && 'watch' in divisions)
    errors.push('watchHours: the calendar has divisions.watch too; keep one')
  for (const [id, raw] of Object.entries(divisions)) {
    const at = `divisions.${id}`
    if (!/^[a-z][\w-]*$/i.test(id)) errors.push(`${at}: an id of letters, digits and -`)
    if ((RESERVED_DIVISIONS as readonly string[]).includes(id))
      errors.push(`${at}: "${id}" is already a name of the moment; choose another`)
    if (!isRecord(raw)) {
      errors.push(`${at}: needs parts or every`)
      continue
    }
    const hasParts = raw.parts !== undefined
    const hasEvery = raw.every !== undefined
    if (hasParts === hasEvery) {
      errors.push(`${at}: needs parts or every (one of them)`)
      continue
    }
    if (hasEvery) {
      if (typeof raw.every !== 'number' || !(raw.every > 0) || raw.every > hoursPerDay)
        errors.push(`${at}.every: hours, more than 0 and at most ${hoursPerDay}`)
      continue
    }
    if (!Array.isArray(raw.parts) || raw.parts.length === 0) {
      errors.push(`${at}.parts: needs at least one part`)
      continue
    }
    const seen = new Set<string>()
    const starts = new Set<number>()
    for (const [i, part] of (raw.parts as unknown[]).entries()) {
      const p = `${at}.parts[${i}]`
      if (!isRecord(part)) {
        errors.push(`${p}: a part ({ id, from })`)
        continue
      }
      if (typeof part.id !== 'string' || !part.id) errors.push(`${p}.id: needed`)
      else if (seen.has(part.id)) errors.push(`${p}.id: "${part.id}" is repeated`)
      else seen.add(part.id)
      const from = minutesOf(part.from, minutesPerDay)
      if (from === undefined) errors.push(`${p}.from: a time like "06:00"`)
      else if (starts.has(from)) errors.push(`${p}.from: another part starts then too`)
      else starts.add(from)
      if (part.until !== undefined && minutesOf(part.until, minutesPerDay) === undefined)
        errors.push(`${p}.until: a time like "06:00"`)
      if (part.tags !== undefined && !(Array.isArray(part.tags) && part.tags.every(isWord)))
        errors.push(`${p}.tags: a list of words`)
    }
    // Each `until` before the next part of the day starts (the last one's: the first's, next day).
    const parts = readParts(raw.parts as DayPartDef[], minutesPerDay)
    parts.forEach((part, i) => {
      if (part.until === undefined) return
      const next = i + 1 < parts.length ? parts[i + 1].from : parts[0].from + minutesPerDay
      // Said where it's written (parts are read in the order of the day).
      const written = (raw.parts as { id?: unknown }[]).findIndex((p) => p?.id === part.id)
      if (part.until <= part.from || part.until > next)
        errors.push(`${at}.parts[${written}].until: after its from, and not past the next part's`)
    })
  }
  return errors
}

const isWord = (v: unknown) => typeof v === 'string' && v.length > 0

function minutesOf(clock: unknown, minutesPerDay: number): number | undefined {
  if (typeof clock !== 'string' || !CLOCK.test(clock)) return undefined
  const m = parseClock(clock)
  return m < minutesPerDay ? m : undefined
}

function readParts(parts: DayPartDef[], minutesPerDay: number): DayPart[] {
  return (
    parts
      .filter((p) => typeof p?.id === 'string' && minutesOf(p.from, minutesPerDay) !== undefined)
      .map((p) => {
        const from = minutesOf(p.from, minutesPerDay)!
        const until = p.until === undefined ? undefined : minutesOf(p.until, minutesPerDay)
        return {
          id: p.id,
          from,
          // An `until` at or before `from` is past midnight.
          ...(until !== undefined && { until: until > from ? until : until + minutesPerDay }),
          ...(p.name !== undefined && { name: p.name }),
          ...(p.description !== undefined && { description: p.description }),
          tags: Array.isArray(p.tags) ? p.tags.filter(isWord) : [],
        }
      })
      // In the order of the day, whatever order they're written in.
      .sort((a, b) => a.from - b.from)
  )
}

/**
 * The divisions a calendar declares, ready to read (validate them first: broken parts are
 * skipped). `watchHours` is read as `watch: { every }` when there's no `watch` of its own.
 */
export function readDivisions(
  divisions: Record<string, DivisionDef> | undefined,
  watchHours: number | undefined,
  hoursPerDay = 24,
): Division[] {
  const minutesPerDay = hoursPerDay * MINUTES_PER_HOUR
  const all: [string, DivisionDef][] = Object.entries(divisions ?? {})
  if (watchHours && !all.some(([id]) => id === 'watch')) all.push(['watch', { every: watchHours }])
  return all.flatMap(([id, def]): Division[] => {
    if (typeof def !== 'object' || def === null) return []
    const texts = {
      ...(def.name !== undefined && { name: def.name }),
      ...(def.description !== undefined && { description: def.description }),
    }
    if (typeof def.every === 'number' && def.every > 0) {
      const length = def.every * MINUTES_PER_HOUR
      const count = Math.ceil(minutesPerDay / length)
      const parts = Array.from({ length: count }, (_, i) => ({
        id: String(i + 1),
        from: Math.round(i * length),
        tags: [],
      }))
      return [{ id, ...texts, numbered: true, parts }]
    }
    if (!Array.isArray(def.parts)) return []
    const parts = readParts(def.parts, minutesPerDay)
    return parts.length ? [{ id, ...texts, numbered: false, parts }] : []
  })
}

/** The part of a division a minute of the day falls in (undefined: in a gap). */
export function partAt(
  division: Division,
  minuteOfDay: number,
  minutesPerDay: number,
): DayPart | undefined {
  const { parts } = division
  return parts.find((part, i) => {
    // Until its `until`, or the next part (the last one: the first, the next day).
    const end = part.until ?? parts[i + 1]?.from ?? parts[0].from + minutesPerDay
    const within = (m: number) => m >= part.from && m < end
    return within(minuteOfDay) || within(minuteOfDay + minutesPerDay)
  })
}

/** What the moment is in each division: `{ meal: 'elevenses', watch: 2 }` (a gap: absent). */
export function divisionValues(
  divisions: readonly Division[],
  minuteOfDay: number,
  minutesPerDay: number,
): { values: Record<string, string | number>; tags: string[] } {
  const values: Record<string, string | number> = {}
  const tags = new Set<string>()
  for (const division of divisions) {
    const part = partAt(division, minuteOfDay, minutesPerDay)
    if (!part) continue
    values[division.id] = division.numbered ? Number(part.id) : part.id
    part.tags.forEach((tag) => tags.add(tag))
  }
  return { values, tags: [...tags] }
}

/**
 * A part named `<division>.<part>` (`meal.luncheon`, `watch.2`): its division and part
 * (undefined: no such part).
 */
export function findPart(
  divisions: readonly Division[],
  ref: string,
): { division: Division; part: DayPart } | undefined {
  const dot = ref.indexOf('.')
  if (dot < 0) return undefined
  const division = divisions.find((d) => d.id === ref.slice(0, dot))
  const part = division?.parts.find((p) => p.id === ref.slice(dot + 1))
  return division && part ? { division, part } : undefined
}
