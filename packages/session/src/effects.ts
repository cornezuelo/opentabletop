import type { TravelState } from '@open-tabletop/travel-engine'

/**
 * Effects: changes to the values a system declares, keyed by the path tables read them
 * with (`party.stats.morale`, `party.resources.food`). A number adds or subtracts (also
 * written as text: '+2'), '=value' sets. One vocabulary for table entries, deck cards and
 * actions; the engines only pass them on, the session applies them.
 */
export type Effects = Record<string, number | string>

/** What a party stat may be: its bounds, and where it starts. */
export interface ValueBounds {
  min?: number
  max?: number
  default?: number
}

/** What the session needs to apply effects: the party's stats and its supplies. */
export interface EffectTarget {
  stats: Record<string, number>
  travel: Pick<TravelState, 'resources' | 'fatigue'>
}

/** One change that happened: the path, before and after. */
export interface AppliedEffect {
  path: string
  from: number
  to: number
}

const number = (v: unknown): number | undefined =>
  typeof v === 'number' && Number.isFinite(v)
    ? v
    : typeof v === 'string' && /^[+-]?\d+(\.\d+)?$/.test(v.trim())
      ? Number(v)
      : undefined

/**
 * A result's effects: its `effects`, plus the older ways of writing the same
 * (`set: { resources: { food: 2 }, stats: { morale: -1 }, fatigue: 1 }`), read as effects.
 */
export function effectsOf(value: Record<string, unknown>): Effects {
  const out: Effects = {}
  const add = (path: string, change: unknown) => {
    const n = number(change)
    if (n !== undefined) out[path] = (number(out[path]) ?? 0) + n
    else if (typeof change === 'string' && change.startsWith('=')) out[path] = change
  }
  const record = (v: unknown) =>
    typeof v === 'object' && v !== null && !Array.isArray(v) ? (v as Record<string, unknown>) : {}
  for (const [id, change] of Object.entries(record(value.resources)))
    add(`party.resources.${id}`, change)
  for (const [id, change] of Object.entries(record(value.stats))) add(`party.stats.${id}`, change)
  if (value.fatigue !== undefined) add('party.fatigue', value.fatigue)
  for (const [path, change] of Object.entries(record(value.effects))) add(path, change)
  return out
}

/**
 * Applies effects to the party (stats within their bounds, supplies and fatigue never
 * below 0); returns what changed and the paths nobody knows (a pack error to report).
 */
export function applyEffects(
  target: EffectTarget,
  effects: Effects,
  bounds: Record<string, ValueBounds> = {},
): { applied: AppliedEffect[]; unknown: string[] } {
  const applied: AppliedEffect[] = []
  const unknown: string[] = []
  const next = (from: number, change: number | string, min: number, max: number) => {
    const set =
      typeof change === 'string' && change.startsWith('=') ? number(change.slice(1)) : undefined
    const delta = number(change)
    const to = set !== undefined ? set : from + (delta ?? 0)
    return Math.min(max, Math.max(min, to))
  }
  for (const [path, change] of Object.entries(effects)) {
    const [, scope, id] = /^party\.(stats|resources)\.(.+)$/.exec(path) ?? []
    if (scope === 'stats') {
      const b = bounds[id] ?? {}
      const from = target.stats[id] ?? b.default ?? 0
      const to = next(from, change, b.min ?? -Infinity, b.max ?? Infinity)
      target.stats[id] = to
      if (to !== from) applied.push({ path, from, to })
    } else if (scope === 'resources') {
      const from = target.travel.resources[id] ?? 0
      const to = next(from, change, 0, Infinity)
      target.travel.resources[id] = to
      if (to !== from) applied.push({ path, from, to })
    } else if (path === 'party.fatigue') {
      const from = target.travel.fatigue
      const to = next(from, change, 0, Infinity)
      target.travel.fatigue = to
      if (to !== from) applied.push({ path, from, to })
    } else unknown.push(path)
  }
  return { applied, unknown }
}
