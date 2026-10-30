import { nextTerrain, type LandModel } from '@open-tabletop/land-engine'
import type { OracleEngine, OracleState } from '@open-tabletop/oracle-engine'
import type { RandomSource } from '@open-tabletop/random'
import type { TravelWorld } from '@open-tabletop/travel-engine'
import { onceRoller } from '@open-tabletop/variables'
import { definitionId } from './refs'
import { effectsOf } from './effects'
import { makePlace, PLACE_PATH, type MadePlace, type PlaceLookup } from './places'

/**
 * A check-like binding: which definition to resolve, with extra context; or, for the
 * terrain, a land model (`land: land.<id>`) that decides it from the land around.
 */
export interface DiscoverBinding {
  resolve?: string
  /** A land model, by `pack/id` (`terrain` only). */
  land?: string
  context?: Record<string, unknown>
}

/**
 * `discover` in a pack's bindings: tables that decide what empty hexes hold as the party
 * travels. `terrain` gives a hex its terrain (a table's `set: { terrain: … }`, or a land
 * model, `land: land.<id>`; a table may hand over to one, `set: { land: land.<id> }`); `contents` is rolled
 * the first time the party enters a discovered hex (its text becomes a point of interest).
 */
export interface DiscoverBindings {
  terrain?: DiscoverBinding
  contents?: DiscoverBinding
  /** What is decided on entering a hex: its empty neighbours too (what the party sees), or only it. */
  reveal: RevealMode
}

export type RevealMode = 'neighbors' | 'entered'
export const REVEAL_MODES: RevealMode[] = ['neighbors', 'entered']

/** What discovery decided for a hex; the host applies it to its map. */
export interface DiscoveredHex {
  terrain?: string
  tags?: string[]
  name?: string
  /** A point of interest (the contents' text, or the name set with `poi`). */
  poi?: string
  /**
   * Places made from templates of the system's catalogues (`place.pois.<template>` in the
   * contents' effects, or in any result's while the party is there), in order.
   */
  places?: MadePlace[]
}

/** Discovery state kept in the session: hexes revealed whose contents are still unknown. */
export interface DiscoveryState {
  pending: string[]
}

export function parseDiscover(
  raw: unknown,
  pack: string | undefined,
  errors: string[],
): DiscoverBindings | undefined {
  if (raw === undefined) return undefined
  if (typeof raw !== 'object' || raw === null) {
    errors.push('bindings.discover: expected terrain, contents and reveal')
    return undefined
  }
  const r = raw as Record<string, unknown>
  const binding = (key: 'terrain' | 'contents'): DiscoverBinding | undefined => {
    const value = r[key] as { resolve?: unknown; land?: unknown; context?: unknown } | undefined
    if (value === undefined) return undefined
    const ok = (v: unknown): v is string => typeof v === 'string' && !!v
    // The terrain may come from a land model instead of a table.
    if (key === 'terrain' && ok(value?.land) && value.resolve === undefined)
      return { land: definitionId(value.land, pack) }
    if (!ok(value?.resolve) || value.land !== undefined) {
      errors.push(
        key === 'terrain'
          ? 'bindings.discover.terrain: needs "resolve" (a table: table.<id>) or "land" (a model: land.<id>)'
          : `bindings.discover.${key}: needs "resolve"`,
      )
      return undefined
    }
    return {
      resolve: definitionId(value.resolve, pack),
      ...(typeof value.context === 'object' &&
        value.context !== null && { context: value.context as Record<string, unknown> }),
    }
  }
  const reveal = r.reveal ?? 'neighbors'
  if (!REVEAL_MODES.includes(reveal as RevealMode))
    errors.push(`bindings.discover.reveal: expected one of ${REVEAL_MODES.join(', ')}`)
  const terrain = binding('terrain')
  const contents = binding('contents')
  return {
    ...(terrain && { terrain }),
    ...(contents && { contents }),
    reveal: REVEAL_MODES.includes(reveal as RevealMode) ? (reveal as RevealMode) : 'neighbors',
  }
}

/** A hex the map leaves open to discovery: inside the map, with no terrain yet. */
const isEmpty = (world: TravelWorld, hex: string) => {
  const cell = world.cell(hex)
  return cell !== null && !cell.terrain
}

const tagsOf = (value: unknown): string[] | undefined =>
  Array.isArray(value)
    ? value.map(String)
    : typeof value === 'string' && value
      ? [value]
      : undefined

/**
 * Discovery during one session step: decides hexes with the Oracle and lays what it found
 * over the host's world, so the rest of the step (routes, speed, checks) already sees it.
 */
export function createDiscovery(options: {
  world: TravelWorld
  oracle: OracleEngine
  discover: DiscoverBindings
  reveal: RevealMode
  locale?: string
  /** The land models the system brings, by `pack/id`. */
  land?: Record<string, LandModel>
  /** For land models (tables roll with the Oracle's own). */
  random: RandomSource
  /** The system's catalogues of places, for contents that name one (`place.pois.<template>`). */
  places?: PlaceLookup
}) {
  const { world: base, oracle, discover, reveal, locale, random } = options
  /** Found during this step, by hex. */
  const found = new Map<string, DiscoveredHex>()

  const world: TravelWorld = {
    ...base,
    cell(hex) {
      const cell = base.cell(hex)
      const extra = found.get(hex)
      if (!cell || !extra) return cell
      return {
        ...cell,
        ...(extra.terrain && { terrain: extra.terrain }),
        ...(extra.tags && { tags: [...new Set([...(cell.tags ?? []), ...extra.tags])] }),
        ...(extra.name && { name: extra.name }),
      }
    },
  }

  const record = (hex: string, patch: DiscoveredHex) =>
    found.set(hex, { ...found.get(hex), ...patch })

  /**
   * The known land around a hex being decided, so lakes, forests and ranges grow together:
   * `around` counts its neighbours' terrains ({ forest: 3, lake: 1 }), `common` is the most
   * frequent one (a tie goes to the terrain it's seen from), with `commonCount`.
   */
  function surroundings(hex: string, here: { terrain?: unknown }): Record<string, unknown> {
    const around: Record<string, number> = {}
    for (const next of base.neighbors(hex)) {
      const t = world.cell(next)?.terrain
      if (typeof t === 'string' && t) around[t] = (around[t] ?? 0) + 1
    }
    const counts = Object.entries(around)
    const best = Math.max(0, ...counts.map(([, n]) => n))
    const tied = counts.filter(([, n]) => n === best).map(([t]) => t)
    const common = tied.includes(here.terrain as string) ? (here.terrain as string) : tied.sort()[0]
    return {
      around,
      aroundCount: counts.reduce((sum, [, n]) => sum + n, 0),
      ...(common && { common, commonCount: best }),
    }
  }

  type Context = Record<string, unknown>
  type Roll = (
    binding: DiscoverBinding,
    context: Context,
  ) => { text?: string; value: Record<string, unknown> }

  /**
   * A land model's terrain for a hex, from its known neighbours (the one it's seen from
   * counting as the model says). `ref` is `pack/id`, or as written in `pack`'s tables.
   */
  function fromLand(ref: string, hex: string, from: string, pack?: string): string | undefined {
    const model = options.land?.[definitionId(ref, pack)]
    if (!model) return undefined
    const known = base.neighbors(hex).flatMap((next) => {
      const t = world.cell(next)?.terrain
      return typeof t === 'string' && t ? [t] : []
    })
    const seen = world.cell(from)?.terrain
    return nextTerrain(model, known, random, typeof seen === 'string' ? seen : undefined).terrain
  }

  /** Decides the terrain of an empty hex, seen from `from`. True if it got one. */
  function terrain(roll: Roll, hex: string, from: string): boolean {
    const binding = discover.terrain
    if (!binding || !isEmpty(world, hex)) return false
    if (binding.land) {
      const chosen = fromLand(binding.land, hex, from)
      if (!chosen) return false
      record(hex, { terrain: chosen })
      return true
    }
    const here = world.cell(from) ?? {}
    const { value } = roll(binding, {
      ...here,
      from: { ...here, id: from },
      place: { id: hex },
      ...surroundings(hex, here),
    })
    // A table may hand the decision over to a land model (`set: { land: land.<id> }`).
    const chosen =
      typeof value.terrain === 'string' && value.terrain
        ? value.terrain
        : typeof value.land === 'string'
          ? fromLand(value.land, hex, from, binding.resolve?.split('/')[0])
          : undefined
    if (!chosen) return false
    record(hex, {
      terrain: chosen,
      ...(tagsOf(value.tags) && { tags: tagsOf(value.tags) }),
    })
    return true
  }

  return {
    world,
    found,
    /**
     * The party is at `hex`, coming from `from` (or the trip starts there). Returns the
     * contents' text when they were rolled, for the journal.
     */
    arrive(
      state: { oracle: OracleState; discovery?: DiscoveryState },
      context: Context,
      hex: string,
      from: string = hex,
    ): { text?: string; discovered?: DiscoveredHex } {
      // The party stays on top of the hex facts (extra); the binding's context wins.
      const { party, ...known } = context
      const roll: Roll = (binding, extra) => {
        const out = oracle.resolve(
          binding.resolve!,
          { ...known, ...extra, ...(party !== undefined && { party }), ...binding.context },
          state.oracle,
          { locale },
        )
        state.oracle = out.state
        return { text: out.resolution.text, value: out.resolution.value }
      }
      const pending = new Set(state.discovery?.pending ?? [])
      // Entering an empty hex discovers it, in either mode.
      if (isEmpty(world, hex) && terrain(roll, hex, from)) pending.add(hex)
      let result: { text?: string; discovered?: DiscoveredHex } = {}
      if (pending.has(hex) && discover.contents) {
        pending.delete(hex)
        const { text, value } = roll(discover.contents, {
          ...world.cell(hex),
          place: { ...world.cell(hex), id: hex },
        })
        // Places named by template (`effects: { place.pois.shrine: 1 }`) instead of the text.
        const context = {
          ...world.cell(hex),
          place: { ...world.cell(hex), id: hex },
          ...value,
          result: text,
        }
        const places = Object.entries(effectsOf(value)).flatMap(([path, change]) => {
          const id = PLACE_PATH.exec(path)?.[1]
          const made =
            id !== undefined &&
            makePlace(id, options.places, context, locale ?? 'en', onceRoller(random))
          if (!made) return []
          const count = typeof change === 'number' ? Math.max(0, Math.floor(change)) : 1
          return Array.from({ length: count }, () => made)
        })
        const tags = [
          ...new Set([...(tagsOf(value.tags) ?? []), ...places.flatMap((p) => p.tags ?? [])]),
        ]
        const poi =
          value.poi === false
            ? undefined
            : typeof value.poi === 'string'
              ? value.poi
              : places.length
                ? undefined
                : text
        const patch: DiscoveredHex = {
          ...(tags.length && { tags }),
          ...(places.length && { places }),
          ...(typeof value.name === 'string' && value.name && { name: value.name }),
          ...(poi && { poi }),
        }
        // "Nothing of note" (no point of interest, tags or name) isn't worth a journal line.
        if (Object.keys(patch).length) {
          record(hex, patch)
          result = { text, discovered: patch }
        }
      } else pending.delete(hex)
      if (reveal === 'neighbors')
        for (const next of base.neighbors(hex)) if (terrain(roll, next, hex)) pending.add(next)
      state.discovery = { pending: [...pending] }
      return result
    },
  }
}

export type Discovery = ReturnType<typeof createDiscovery>
