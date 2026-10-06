import type { OracleEngine, OracleState } from '@open-tabletop/oracle-engine'
import type { TravelWorld } from '@open-tabletop/travel-engine'

/** A check-like binding: which definition to resolve, with extra context. */
export interface DiscoverBinding {
  resolve: string
  context?: Record<string, unknown>
}

/**
 * `discover` in a pack's bindings: tables that decide what empty hexes hold as the party
 * travels. `terrain` gives a hex its terrain (`set: { terrain: … }`); `contents` is rolled
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
    const value = r[key] as { resolve?: unknown; context?: unknown } | undefined
    if (value === undefined) return undefined
    if (typeof value?.resolve !== 'string' || !value.resolve) {
      errors.push(`bindings.discover.${key}: needs "resolve"`)
      return undefined
    }
    return {
      resolve: pack && !value.resolve.includes('/') ? `${pack}/${value.resolve}` : value.resolve,
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
}) {
  const { world: base, oracle, discover, reveal, locale } = options
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

  type Context = Record<string, unknown>
  type Roll = (
    binding: DiscoverBinding,
    context: Context,
  ) => { text?: string; value: Record<string, unknown> }

  /** Decides the terrain of an empty hex, seen from `from`. True if it got one. */
  function terrain(roll: Roll, hex: string, from: string): boolean {
    if (!discover.terrain || !isEmpty(world, hex)) return false
    const here = world.cell(from) ?? {}
    const { value } = roll(discover.terrain, { ...here, from, hex })
    if (typeof value.terrain !== 'string' || !value.terrain) return false
    record(hex, {
      terrain: value.terrain,
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
      const roll: Roll = (binding, extra) => {
        const out = oracle.resolve(
          binding.resolve,
          { ...context, ...extra, ...binding.context },
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
        const { text, value } = roll(discover.contents, { ...world.cell(hex), hex })
        const tags = tagsOf(value.tags)
        const poi =
          value.poi === false ? undefined : typeof value.poi === 'string' ? value.poi : text
        const patch: DiscoveredHex = {
          ...(tags && { tags }),
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
