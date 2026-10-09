/**
 * Factions as data. A pack declares them (`kind: factions`): the sheet their values are
 * kept on, the table each one rolls on its turn, how often turns come, and each faction's
 * name, colour, starting values and territory. This engine knows their **territory** (the
 * hexes each holds: claimed, grown and lost from its border) and **when turns are due**;
 * their values are characters of a sheet (the character engine), and what a turn does is
 * the integration layer's. It knows no game.
 *
 * Pure functions; randomness comes from the `RandomSource` the caller gives.
 */
import type { RandomSource } from '@open-tabletop/random'
import { z } from 'zod'

const text = z.union([z.string(), z.record(z.string(), z.string())])

const faction = z
  .object({
    name: text.optional(),
    description: text.optional(),
    /** Its colour on the map (`#rrggbb`). */
    color: z
      .string()
      .regex(/^#[0-9a-fA-F]{6}$/)
      .optional(),
    /** Starting values of its sheet (the rest: the sheet's defaults). */
    values: z.record(z.string(), z.number()).optional(),
    tags: z.array(z.string()).optional(),
    /** Where it starts: every hex of these regions (by name), and these hexes. */
    territory: z
      .object({
        regions: z.array(z.string().min(1)).optional(),
        hexes: z.array(z.string().min(1)).optional(),
      })
      .strict()
      .optional(),
    /** What it rolls on its turn, instead of the definition's `turn`. */
    turn: z.string().min(1).optional(),
    noteRef: z.string().optional(),
  })
  .strict()

export const factionsSchema = z
  .object({
    kind: z.literal('factions'),
    id: z.string().min(1),
    name: text.optional(),
    description: text.optional(),
    /** The `kind: sheet` every faction is made with (`id` of its pack, or `pack/id`). */
    sheet: z.string().min(1),
    /** What each faction rolls on its turn (a table, oracle, generator or deck). */
    turn: z.string().min(1).optional(),
    /** Days of the world clock between turns; absent or 0: only by hand. */
    every: z.number().min(0).optional(),
    factions: z.record(z.string().regex(/^[a-z0-9][a-z0-9-]*$/), faction).default({}),
  })
  .strict()

export type FactionsDef = z.infer<typeof factionsSchema>
export type FactionDef = z.infer<typeof faction>

/** Reads a `kind: factions` definition: it, or the problems found (`path: message`). */
export function parseFactions(raw: unknown): { factions?: FactionsDef; errors: string[] } {
  const parsed = factionsSchema.safeParse(raw)
  if (!parsed.success)
    return {
      errors: parsed.error.issues.map((i) => `${i.path.join('.') || 'factions'}: ${i.message}`),
    }
  const errors: string[] = []
  for (const [id, f] of Object.entries(parsed.data.factions))
    if (!f.turn && !parsed.data.turn)
      errors.push(`factions.${id}.turn: nothing to roll on its turn`)
  return errors.length ? { errors } : { factions: parsed.data, errors }
}

/** Who holds what: each faction's hexes, by faction id. */
export type Territories = Record<string, string[]>

/** The map as territory sees it: each hex's neighbours, and whether a faction may hold it. */
export interface TerritoryWorld {
  neighbors(hex: string): string[]
  /** Hexes a faction can't hold (off the map, open sea…): absent, all can. */
  holdable?(hex: string): boolean
}

/** The faction that holds a hex, if any. */
export function holderOf(territories: Territories, hex: string): string | undefined {
  return Object.keys(territories).find((id) => territories[id].includes(hex))
}

/** A faction takes these hexes (from whoever held them). */
export function claim(territories: Territories, faction: string, hexes: string[]): Territories {
  const out: Territories = {}
  for (const [id, held] of Object.entries(territories))
    out[id] = held.filter((h) => !hexes.includes(h))
  out[faction] = [...new Set([...(out[faction] ?? []), ...hexes])]
  return out
}

/** A faction gives up these hexes (they become nobody's). */
export function release(territories: Territories, faction: string, hexes: string[]): Territories {
  return {
    ...territories,
    [faction]: (territories[faction] ?? []).filter((h) => !hexes.includes(h)),
  }
}

/** The hexes next to a faction's territory that aren't its own (and it may hold). */
export function frontier(
  territories: Territories,
  faction: string,
  world: TerritoryWorld,
): string[] {
  const own = new Set(territories[faction] ?? [])
  const out = new Set<string>()
  for (const hex of own)
    for (const n of world.neighbors(hex))
      if (!own.has(n) && (world.holdable?.(n) ?? true)) out.add(n)
  return [...out].sort()
}

/** Its hexes that touch something not its own (where it loses ground first). */
export function border(territories: Territories, faction: string, world: TerritoryWorld): string[] {
  const own = new Set(territories[faction] ?? [])
  return [...own].filter((h) => world.neighbors(h).some((n) => !own.has(n))).sort()
}

export type TerritoryEvent =
  | { type: 'TERRITORY_GAINED'; faction: string; hex: string; from?: string }
  | { type: 'TERRITORY_LOST'; faction: string; hex: string }

/**
 * A faction's territory changed by `by` hexes, one at a time: growing takes a hex of its
 * frontier (one nobody holds first, then another faction's), shrinking gives up a border
 * hex. A faction with no territory can't grow (it has nowhere to start from).
 */
export function changeTerritory(
  territories: Territories,
  faction: string,
  by: number,
  world: TerritoryWorld,
  random: RandomSource,
): { territories: Territories; events: TerritoryEvent[] } {
  let out = territories
  const events: TerritoryEvent[] = []
  const pick = <T>(list: T[]) => list[Math.floor(random.next() * list.length)]
  for (let i = 0; i < Math.abs(Math.round(by)); i++) {
    if (by > 0) {
      const options = frontier(out, faction, world)
      const free = options.filter((h) => !holderOf(out, h))
      const hex = pick(free.length ? free : options)
      if (hex === undefined) break
      const from = holderOf(out, hex)
      out = claim(out, faction, [hex])
      events.push({ type: 'TERRITORY_GAINED', faction, hex, ...(from && { from }) })
    } else {
      const options = border(out, faction, world)
      const hex = pick(options.length ? options : (out[faction] ?? []))
      if (hex === undefined) break
      out = release(out, faction, [hex])
      events.push({ type: 'TERRITORY_LOST', faction, hex })
    }
  }
  return { territories: out, events }
}

/**
 * The world turns due between the last one and now, every `every` days (in minutes of the
 * world clock, `day` minutes long): their moments, oldest first. None when turns are by
 * hand only (`every` 0 or absent), or when there was no turn yet (the first comes `every`
 * days after `since`).
 */
export function turnsDue(
  since: number,
  now: number,
  every: number | undefined,
  day = 1440,
): number[] {
  if (!every || every <= 0) return []
  const step = every * day
  const out: number[] = []
  for (let at = since + step; at <= now && out.length < 100; at += step) out.push(at)
  return out
}
