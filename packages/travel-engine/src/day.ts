import { findPart, parseClock, type Calendar } from '@open-tabletop/time'

/** A part of the calendar's day as rules name it: `time.<division>.<part>` (`time.meal.supper`). */
export const PART_REF = /^time\.[A-Za-z][\w-]*\.[\w-]+$/

/** Whether a moment or a time names a part of the calendar's day (`time.meal.supper`). */
export const isPartRef = (value: unknown): value is string =>
  typeof value === 'string' && PART_REF.test(value)

/** The calendar's own name of a part rules name (`time.meal.supper` → `meal.supper`). */
export const partKey = (ref: string): string => ref.replace(/^time\./, '')

/** A part of the calendar's day by the name rules give it (`time.meal.supper`). */
export function findPartRef(divisions: Parameters<typeof findPart>[0], ref: string) {
  return isPartRef(ref) ? findPart(divisions, partKey(ref)) : undefined
}

/**
 * When the system's day starts or night falls, as minutes of the day: a clock
 * (`'06:00'`) or a part of the calendar's day (`time.meal.first-breakfast`: when it starts).
 * A part the calendar doesn't have is read as `fallback` (the session says so).
 */
export function dayClock(value: string, calendar: Calendar, fallback: string): number {
  if (!isPartRef(value)) return parseClock(value)
  return findPartRef(calendar.divisions ?? [], value)?.part.from ?? parseClock(fallback)
}

/**
 * Every part of the day travel rules name, with where: when trips start and the halt
 * (`travel.start`, `travel.halt.at`), checks' moments, actions' moments and their time
 * steps. The calendar must have each one.
 */
export function partRefsOf(rules: {
  travel?: { start?: string; halt?: { at: string } }
  checks?: { at?: unknown }[]
  actions?: Record<string, { on?: unknown; do?: { time?: unknown }[] }>
}): [path: string, ref: string][] {
  const out: [string, string][] = []
  const list = (v: unknown): unknown[] => (v === undefined ? [] : [v].flat())
  if (isPartRef(rules.travel?.start)) out.push(['travel.start', rules.travel.start])
  if (isPartRef(rules.travel?.halt?.at)) out.push(['travel.halt.at', rules.travel.halt.at])
  rules.checks?.forEach((c, i) =>
    list(c.at).forEach((m) => isPartRef(m) && out.push([`checks.${i}.at`, m])),
  )
  for (const [id, a] of Object.entries(rules.actions ?? {})) {
    list(a.on).forEach((m) => isPartRef(m) && out.push([`actions.${id}.on`, m]))
    a.do?.forEach((s, j) => isPartRef(s?.time) && out.push([`actions.${id}.do.${j}.time`, s.time]))
  }
  return out
}
