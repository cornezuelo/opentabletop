import {
  CURRENT_VERSION,
  DEFAULT_CAPTIONS,
  DEFAULT_GLYPH_OPACITY,
  DEFAULT_GLYPHS,
  DEFAULT_REGION_STYLE,
} from './defaults'
import { newId } from './id'
import {
  migrateFatigue,
  migrateGenericSheets,
  migrateLost,
  migratePlaces,
  migrateSupplies,
  migrateTotals,
} from '@open-tabletop/session'

/**
 * `migrations[n]` upgrades raw data from version n to n + 1. Every format change
 * bumps CURRENT_VERSION and adds an entry here.
 */
const migrations: Record<number, (data: Record<string, unknown>) => Record<string, unknown>> = {
  /** v2: tokens. The party's own icon (play.token) and location become a `party` token. */
  1(data) {
    const play = data.play as Record<string, unknown> | undefined
    const tokens: Record<string, unknown>[] = []
    if (play && typeof play === 'object') {
      const { token, location, ...rest } = play as {
        token?: { iconId?: string; color?: string; halo?: boolean }
        location?: string
      } & Record<string, unknown>
      if (location || token)
        tokens.push({
          id: newId(),
          name: '',
          kind: 'party',
          hex: location,
          iconId: token?.iconId ?? 'game:meeple',
          ...(token?.color && { color: token.color }),
          ...(token?.halo === false && { halo: false }),
        })
      data = { ...data, play: rest }
    }
    return { ...data, tokens }
  },
  /** v3: terrain glyphs. Built-in terrains get their default symbol; custom ones none. */
  2(data) {
    const terrains = Array.isArray(data.terrains) ? data.terrains : []
    const grid = (typeof data.grid === 'object' && data.grid) || {}
    return {
      ...data,
      grid: { ...grid, glyphs: DEFAULT_GLYPH_OPACITY },
      terrains: terrains.map((t: Record<string, unknown>) =>
        typeof t?.id === 'string' && DEFAULT_GLYPHS[t.id]
          ? { ...t, glyph: DEFAULT_GLYPHS[t.id] }
          : t,
      ),
    }
  },
  /** v4: regions. */
  3(data) {
    return { ...data, regions: [] }
  },
  /** v5: map text styles. A hidden "Hex names" layer becomes hexNames.show = false. */
  4(data) {
    const captions = structuredClone(DEFAULT_CAPTIONS) as Record<string, { show: boolean }>
    const layers = (data.layers ?? {}) as Record<string, { visible?: boolean }>
    if (layers.names?.visible === false) captions.hexNames.show = false
    return { ...data, captions }
  },
  /**
   * v6: the Oracle per map. A trip's Oracle state (decks, once-only entries) becomes the
   * map's, shared with hand rolls; the hand-roll history starts empty.
   */
  5(data) {
    const session = (data.play as { rules?: { session?: { oracle?: unknown } } } | undefined)?.rules
      ?.session
    const state = session?.oracle
    return typeof state === 'object' && state !== null
      ? { ...data, oracle: { state, history: [] } }
      : data
  },
  /** v7: key/value fields on tokens, icons, regions and POIs (optional: nothing to convert). */
  6(data) {
    return data
  },
  /** v8: region styles. Maps keep the look they had (the defaults are that look). */
  7(data) {
    return { ...data, regionStyle: { ...DEFAULT_REGION_STYLE } }
  },
  /** v9: packs per map (optional: absent means all, as before). */
  8(data) {
    return data
  },
  /** v10: the world clock (optional: maps without one have none). */
  9(data) {
    return data
  },
  /** v11: the party's fatigue is one of the system's stats (it was in the travel state). */
  10(data) {
    const play = data.play as { rules?: { session?: unknown } } | undefined
    const session = play?.rules?.session as Parameters<typeof migrateFatigue>[0] | undefined
    if (!session?.travel) return data
    return {
      ...data,
      play: { ...play, rules: { ...play!.rules, session: migrateFatigue(session) } },
    }
  },
  /** v12: being lost is a value the system declares (`today.lost`, not `lostToday`). */
  11(data) {
    const play = data.play as { rules?: { session?: unknown } } | undefined
    const session = play?.rules?.session as Parameters<typeof migrateLost>[0] | undefined
    if (!session?.travel) return data
    return {
      ...data,
      play: { ...play, rules: { ...play!.rules, session: migrateLost(session) } },
    }
  },
  /** v13: the trail can be drawn straight (optional: maps without it draw curves). */
  12(data) {
    return data
  },
  /**
   * v14: the map chooses a system (`meta.system`): the one its trip plays. Its packs become
   * the ones it adds to the system's; the old list still holds them all, so nothing changes.
   */
  13(data) {
    const meta = (data.meta ?? {}) as Record<string, unknown>
    const play = data.play as { rules?: { system?: unknown } } | undefined
    const system = play?.rules?.system
    if (typeof meta.system === 'string' || typeof system !== 'string' || system === 'generic')
      return data
    return { ...data, meta: { ...meta, system } }
  },
  /**
   * v15: a map's scale is optional: without one it's played at its system's (`travel.hexKm`).
   * Every map had 10 km, the default: that one becomes "the system's" (the same where the
   * system sets none); any other was chosen, and stays.
   */
  14(data) {
    const scale = data.scale as { hexKm?: unknown } | undefined
    if (scale?.hexKm !== 10) return data
    return { ...data, scale: {} }
  },
  /** v16: the trip's totals (`travel.totals`: hexes, hours, actions…), rebuilt from its journal. */
  15(data) {
    const play = data.play as { rules?: { session?: unknown } } | undefined
    const session = play?.rules?.session as Parameters<typeof migrateTotals>[0] | undefined
    if (!session?.travel || !Array.isArray(session.journal)) return data
    return {
      ...data,
      play: { ...play, rules: { ...play!.rules, session: migrateTotals(session, kmOf(data)) } },
    }
  },
  /**
   * v17: a trip's party may be made of characters (`session.members`, who is acting in
   * `session.acting`); older trips have none, and their party plays as a whole as before.
   */
  16(data) {
    return data
  },
  /** v18: the factions of the map's system on the map (`factions`); older maps have none. */
  17(data) {
    return data
  },
  /**
   * v19: a progress clock may name the clock its system declares that it was made from
   * (`ref`); older maps' clocks are all made by hand.
   */
  18(data) {
    return data
  },
  /**
   * v20: a trip keeps the party's own sheet (`session.party`, the system's `partySheet`)
   * and who rolls (`rolls`, `askRolls`, `asking`); older trips have none (a party sheet is
   * made when they next play, if their system has one; the best rolls).
   */
  19(data) {
    return data
  },
  /**
   * v21: the characters' relations are a layer of their own (`layers.relations`), hidden
   * until shown in Layers; Play's **Show relations** (`play.showRelations`) is gone.
   */
  20(data) {
    const play = data.play as Record<string, unknown> | undefined
    if (!play || !('showRelations' in play)) return data
    const rest = { ...play }
    delete rest.showRelations
    return { ...data, play: rest }
  },
  /**
   * v22: the Generic rules are Core's system (`core`), no longer built in: a trip played
   * with `generic` plays Core's, and characters made with its sheets (`generic/character`,
   * `generic/party`) have Core's (`core/character`, `core/party`), on tokens too.
   */
  21(data) {
    const play = data.play as
      { rules?: { system?: unknown; session?: unknown; members?: unknown } } | undefined
    const sheet = (c: unknown) => {
      const character = c as { sheet?: unknown } | undefined
      return typeof character?.sheet === 'string' && character.sheet.startsWith('generic/')
        ? { ...character, sheet: `core/${character.sheet.slice(8)}` }
        : c
    }
    const out = Array.isArray(data.tokens)
      ? {
          ...data,
          tokens: (data.tokens as Record<string, unknown>[]).map((t) =>
            t?.character ? { ...t, character: sheet(t.character) } : t,
          ),
        }
      : data
    const rules = play?.rules
    if (!rules) return out
    const session = rules.session as Parameters<typeof migrateGenericSheets>[0] | undefined
    return {
      ...out,
      play: {
        ...play,
        rules: {
          ...rules,
          ...(rules.system === 'generic' && { system: 'core' }),
          ...(session && typeof session === 'object' && { session: migrateGenericSheets(session) }),
          ...(Array.isArray(rules.members) && { members: rules.members.map(sheet) }),
        },
      },
    }
  },
  /**
   * v23: a trip knows where its last step's journal lines start (`session.lastStep`), shown
   * under its buttons; older trips show them from their next step on.
   */
  22(data) {
    return data
  },
  /**
   * v24: campaigns. The map belongs to a campaign of its own (`meta.campaign`, the map's
   * id, unless a file names the campaign it's in: two example maps of one), which takes its world clock, world weather, factions' sheets and Oracle state; the
   * land each faction holds stays on the map (`territories`). Those parts are left in the
   * data for `readMap`, which hands them over to make the campaign.
   */
  23(data) {
    const meta = data.meta as Record<string, unknown> | undefined
    const factions = data.factions as { territories?: unknown } | undefined
    return {
      ...data,
      ...(meta && typeof meta === 'object' && { meta: { campaign: meta.id, ...meta } }),
      ...(factions && typeof factions === 'object' && { territories: factions.territories }),
    }
  },
  /**
   * v25: the system a map is played with and the packs it adds are its campaign's, shared
   * by the campaign's maps and trips. They're left in the data (`system`, `packs`) for
   * `readMap`, which hands them over to the campaign.
   */
  24(data) {
    const meta = data.meta as Record<string, unknown> | undefined
    if (!meta || typeof meta !== 'object') return data
    const { system, packs, ...rest } = meta
    return {
      ...data,
      meta: rest,
      ...(system !== undefined && data.system === undefined && { system }),
      ...(packs !== undefined && data.packs === undefined && { packs }),
    }
  },
  /**
   * v26: the party token keeps no key-values: the party's sheet and stats are the trip's,
   * and nothing read the token's.
   */
  25(data) {
    if (!Array.isArray(data.tokens)) return data
    return {
      ...data,
      tokens: data.tokens.map((token: Record<string, unknown>) => {
        if (token?.kind !== 'party' || token.fields === undefined) return token
        const rest = { ...token }
        delete rest.fields
        return rest
      }),
    }
  },
  /**
   * v27: the party's supplies are its values or items, as its system says: a trip's old
   * supplies (`session.travel.resources`) move to the party sheet's values of the same id.
   */
  26(data) {
    const play = data.play as { rules?: { session?: unknown } } | undefined
    const session = play?.rules?.session as Parameters<typeof migrateSupplies>[0] | undefined
    if (!session || typeof session !== 'object' || !session.travel) return data
    return {
      ...data,
      play: { ...play, rules: { ...play!.rules, session: migrateSupplies(session) } },
    }
  },
  /**
   * v28: a trip says places where it said hexes: its journal's `HEX_ENTERED` lines are
   * `PLACE_ENTERED`, an action's or a destination's `hex` is its `place`, and its totals
   * count places entered and their km (at the map's scale, else 10).
   */
  27(data) {
    const play = data.play as { rules?: { session?: unknown } } | undefined
    const session = play?.rules?.session as Parameters<typeof migratePlaces>[0] | undefined
    if (!session?.travel || !Array.isArray(session.journal)) return data
    return {
      ...data,
      play: { ...play, rules: { ...play!.rules, session: migratePlaces(session, kmOf(data)) } },
    }
  },
  /** v29: connections drawn between places (`connections`); older maps have none. */
  28(data) {
    return data
  },
  /**
   * v30: sub-maps (`meta.parent`, where one hangs), a trip gone on into another map
   * (`play.away`), a far connection's own `km`; older maps have none.
   */
  29(data) {
    return data
  },
  /** v31: square grids (`grid.kind: square`); older maps are hexes. */
  30(data) {
    return data
  },
  /**
   * v32: a cell's km, hexes or squares, is the scale's `cellKm` (`hexKm` before); whether
   * diagonal squares are neighbours is the system's (`travel.diagonals`), no longer the grid's.
   */
  31(data) {
    const scale = data.scale as { hexKm?: unknown } | undefined
    const grid = { ...(data.grid as Record<string, unknown> | undefined) }
    delete grid.diagonals
    const moved = { ...data, ...(data.grid !== undefined && { grid }) }
    if (!scale || !('hexKm' in scale)) return moved
    const { hexKm, ...rest } = scale
    return { ...moved, scale: { ...rest, cellKm: hexKm } }
  },
  /** v33: regions inside regions (a region's `parent`); older maps' regions are all outermost. */
  32(data) {
    return data
  },
  /** v34: a sub-map's ways to its parent are a list (`meta.parent.ways`); older ones had one. */
  33(data) {
    const meta = data.meta as { parent?: Record<string, unknown> } | undefined
    const parent = meta?.parent
    if (!parent || 'ways' in parent) return data
    const { map, ...way } = parent
    return { ...data, meta: { ...meta, parent: { map, ways: [way] } } }
  },
}

/** The km a hex of an older map measures: its own scale, else the default's 10. */
const kmOf = (data: Record<string, unknown>): number => {
  const km = (data.scale as { hexKm?: unknown } | undefined)?.hexKm
  return typeof km === 'number' && km > 0 ? km : 10
}

export function migrate(data: Record<string, unknown>): Record<string, unknown> {
  let version = typeof data.version === 'number' ? data.version : 0
  if (version > CURRENT_VERSION) throw new MapFormatError('newerVersion')
  while (version < CURRENT_VERSION) {
    const step = migrations[version]
    if (!step) throw new MapFormatError('invalid')
    data = { ...step(data), version: version + 1 }
    version++
  }
  return data
}

export type MapFormatErrorCode = 'invalid' | 'newerVersion'

export class MapFormatError extends Error {
  constructor(public code: MapFormatErrorCode) {
    super(`Map format error: ${code}`)
  }
}
