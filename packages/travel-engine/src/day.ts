import { findPart, parseClock, type Calendar } from '@open-tabletop/time'

/** A part of the calendar's day as rules name it: `<division>.<part>` (`meal.supper`). */
export const PART_REF = /^[A-Za-z][\w-]*\.[\w-]+$/

/** Whether a moment or a time names a part of the calendar's day (`meal.supper`). */
export const isPartRef = (value: unknown): value is string =>
  typeof value === 'string' && PART_REF.test(value)

/**
 * When the system's day starts or night falls, as minutes of the day: a clock
 * (`'06:00'`) or a part of the calendar's day (`meal.first-breakfast`: when it starts).
 * A part the calendar doesn't have is read as `fallback` (the session says so).
 */
export function dayClock(value: string, calendar: Calendar, fallback: string): number {
  if (!isPartRef(value)) return parseClock(value)
  return findPart(calendar.divisions ?? [], value)?.part.from ?? parseClock(fallback)
}

/**
 * Every part of the day travel rules name, with where: the system's day
 * (`day.start: meal.breakfast`), checks' moments, actions' moments and their time steps.
 * The calendar must have each one.
 */
export function partRefsOf(rules: {
  day: { start: string; nightfall: string }
  checks?: { at?: string | string[] }[]
  actions?: Record<string, false | { on?: string | string[]; do?: { time?: unknown }[] }>
}): [path: string, ref: string][] {
  const out: [string, string][] = []
  const list = (v: string | string[] | undefined) => (v === undefined ? [] : [v].flat())
  for (const key of ['start', 'nightfall'] as const)
    if (isPartRef(rules.day[key])) out.push([`day.${key}`, rules.day[key]])
  rules.checks?.forEach((c, i) =>
    list(c.at).forEach((m) => isPartRef(m) && out.push([`checks.${i}.at`, m])),
  )
  for (const [id, a] of Object.entries(rules.actions ?? {})) {
    if (!a) continue
    list(a.on).forEach((m) => isPartRef(m) && out.push([`actions.${id}.on`, m]))
    a.do?.forEach((s, j) => isPartRef(s?.time) && out.push([`actions.${id}.do.${j}.time`, s.time]))
  }
  return out
}
