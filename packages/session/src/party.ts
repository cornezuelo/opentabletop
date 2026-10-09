import {
  applyCharacter,
  characterFacts,
  createCharacter,
  membersBlock,
  partyValue,
  shareChange,
  boundsOf,
  type CharacterEvent,
  type CharacterState,
  type Sheet,
} from '@open-tabletop/character-engine'
import {
  hexIdOf,
  momentRolls,
  type Bounds,
  type TravelRules,
  type TravelState,
  type TravelWorld,
} from '@open-tabletop/travel-engine'
import type { Bindings } from './index'
import type { Effects, LimitReached } from './effects'

/**
 * The party as its members: the sheet they're made with (the system's `sheet`), and what
 * the system's bindings say the party takes from them (stats `from` their values, supplies
 * they carry). A system without a sheet plays the party as a whole, as before.
 */
export interface PartyRules {
  sheet?: { id: string; def: Sheet }
  bindings?: Bindings
}

/** What the session keeps of the members (a trip's state has more). */
export interface PartyTarget {
  members?: CharacterState[]
  acting?: string
  /** Who holds each of the system's journey roles (`roles.<id>.*`), by role id. */
  roles?: Record<string, string>
  stats: Record<string, number>
  travel: Pick<TravelState, 'resources'> & Partial<Pick<TravelState, 'seed' | 'day' | 'location'>>
}

/** The sheet a member is made with, when it's the system's (one sheet per system for now). */
export const sheetOf =
  (rules: PartyRules) =>
  (member: CharacterState): Sheet | undefined =>
    rules.sheet && member.sheet === rules.sheet.id ? rules.sheet.def : undefined

/** A new member of the system's sheet, with its defaults and `init`. */
export function newMember(
  rules: PartyRules,
  init: Partial<CharacterState> & { id: string },
): CharacterState {
  if (!rules.sheet) throw new Error('This system has no sheet for its members')
  return createCharacter(rules.sheet.def, rules.sheet.id, init)
}

const hasMembers = (s: PartyTarget): s is PartyTarget & { members: CharacterState[] } =>
  !!s.members?.length

/**
 * Brings the party up to date with its members (in place): the stats made of theirs, and
 * the supplies they carry as their sum. Nothing changes for a party without members.
 */
export function refreshParty(s: PartyTarget, rules: PartyRules): void {
  if (!hasMembers(s)) return
  for (const [id, stat] of Object.entries(rules.bindings?.stats ?? {}))
    if (stat.from) s.stats[id] = partyValue(s.members, stat.from)
  for (const [id, supply] of Object.entries(rules.bindings?.resources ?? {}))
    s.travel.resources[id] = s.members.reduce((sum, m) => sum + (m.values[supply.carried] ?? 0), 0)
}

/** The supplies the members carry, as they are now (to settle what changes later). */
export function carriedNow(s: PartyTarget, rules: PartyRules): Record<string, number> {
  if (!hasMembers(s)) return {}
  return Object.fromEntries(
    Object.keys(rules.bindings?.resources ?? {}).map((id) => [id, s.travel.resources[id] ?? 0]),
  )
}

/**
 * Shares out among the members what the party's carried supplies changed since `before`
 * (`carriedNow`), and brings the party up to date (in place).
 */
export function settleParty(
  s: PartyTarget,
  rules: PartyRules,
  before: Record<string, number>,
): CharacterEvent[] {
  const events: CharacterEvent[] = []
  if (hasMembers(s))
    for (const [id, supply] of Object.entries(rules.bindings?.resources ?? {})) {
      const delta = (s.travel.resources[id] ?? 0) - (before[id] ?? 0)
      if (!delta) continue
      const shared = shareChange(sheetOf(rules), s.members, supply.carried, delta, supply.share)
      s.members = shared.members
      events.push(...shared.events)
    }
  refreshParty(s, rules)
  return events
}

/**
 * The bounds of the supplies the members carry: the sums of theirs (a side without a bound
 * in some member has none). The others keep the system's.
 */
export function carriedBounds(s: PartyTarget, rules: PartyRules): Record<string, Bounds> {
  if (!hasMembers(s)) return {}
  const out: Record<string, Bounds> = {}
  for (const [id, supply] of Object.entries(rules.bindings?.resources ?? {})) {
    const each = s.members.map((m) => {
      const sheet = sheetOf(rules)(m)
      return sheet ? boundsOf(sheet, m, supply.carried) : {}
    })
    const sum = (key: 'min' | 'max') =>
      each.every((b) => b[key] !== undefined)
        ? each.reduce((total, b) => total + b[key]!, 0)
        : undefined
    const min = sum('min')
    const max = sum('max')
    out[id] = { ...(min !== undefined && { min }), ...(max !== undefined && { max }) }
  }
  return out
}

/** Travel rules whose carried supplies have the members' bounds (for the travel engine). */
export function rulesWithMembers(
  travel: TravelRules,
  s: PartyTarget,
  rules: PartyRules,
): TravelRules {
  const bounds = carriedBounds(s, rules)
  if (!Object.keys(bounds).length) return travel
  const resources = { ...travel.resources }
  for (const [id, b] of Object.entries(bounds)) {
    // The members' bounds replace the supply's own (a side they don't bound has none).
    const own = { ...resources[id] } as Record<string, unknown>
    delete own.min
    delete own.max
    resources[id] = { ...own, ...b } as NonNullable<TravelRules['resources']>[string]
  }
  return { ...travel, resources }
}

/** What the members' conditions block for the party (`party.blocked` for the travel engine). */
export function partyBlocks(
  s: PartyTarget,
  rules: PartyRules,
): Record<string, { value: string; who: string }> {
  return hasMembers(s) ? membersBlock(sheetOf(rules), s.members) : {}
}

/**
 * What conditions and tables read of the members: `characters.<id>.*` (each one's facts:
 * `characters.kael.values.health`, `characters.kael.conditions`…) and `acting.*` (the one
 * acting now, if any).
 */
export function memberFacts(
  s: Pick<PartyTarget, 'members' | 'acting' | 'roles'>,
): Record<string, unknown> {
  if (!s.members?.length) return {}
  const characters = Object.fromEntries(s.members.map((m) => [m.id, characterFacts(m)]))
  const acting = s.acting !== undefined ? characters[s.acting] : undefined
  // Each journey role held, as its holder (`roles.guide.values.pathfinding`).
  const roles = Object.fromEntries(
    Object.entries(s.roles ?? {}).flatMap(([role, id]) =>
      characters[id] ? [[role, characters[id]]] : [],
    ),
  )
  return {
    characters,
    ...(acting && { acting }),
    ...(Object.keys(roles).length && { roles }),
  }
}

/**
 * Who an effect's or a fact's path is about, and the rest: `party.members` (every member),
 * `characters.<id>`, `acting`, `roles.<id>` (whoever holds the role).
 */
export const MEMBER_PATH =
  /^(party\.members|characters\.[^.]+|acting|roles\.[^.]+)\.(values|conditions)\.(.+)$/

/** Whether an effect's path is about members (`party.members.…`, `characters.<id>.…`, `acting.…`). */
export const isMemberPath = (path: string): boolean => MEMBER_PATH.test(path)

/**
 * Applies the effects on members: `party.members.values.health: -1` (every member),
 * `characters.<id>.…` (one), `acting.…` (the one acting) or `roles.<id>.…` (whoever holds
 * the role; nobody: `nobody`). Within
 * each one's sheet; what hits a bound is in `limits` (by the member's path). Other paths
 * are left alone, and so is everything for a party without members.
 */
export function applyMemberEffects(
  s: PartyTarget,
  effects: Effects,
  rules: PartyRules,
  context: Record<string, unknown> = {},
  time?: number,
): { limits: LimitReached[]; events: CharacterEvent[]; nobody: string[]; unknown: string[] } {
  const limits: LimitReached[] = []
  const events: CharacterEvent[] = []
  const nobody: string[] = []
  const unknown: string[] = []
  // A party played as a whole: what its system says of characters doesn't apply.
  if (!s.members?.length) return { limits, events, nobody, unknown }
  const { travel } = s
  const roller =
    travel.day !== undefined
      ? momentRolls(
          { seed: travel.seed, day: travel.day, location: travel.location ?? '' },
          hexIdOf(context),
          typeof context.moment === 'string' ? context.moment : undefined,
        )
      : undefined
  for (const [path, change] of Object.entries(effects)) {
    const [, who, part, id] = MEMBER_PATH.exec(path) ?? []
    if (!who) continue
    const rest = `${part}.${id}`
    const members: CharacterState[] = s.members ?? []
    const holder = who.startsWith('roles.') ? s.roles?.[who.slice('roles.'.length)] : undefined
    const targets: CharacterState[] =
      who === 'party.members'
        ? members
        : who === 'acting'
          ? members.filter((m) => m.id === s.acting)
          : who.startsWith('roles.')
            ? members.filter((m) => m.id === holder)
            : members.filter((m) => m.id === who.slice('characters.'.length))
    if (!targets.length) {
      // Nobody acting, or nobody holding the role: nothing happens, and the journal says so.
      ;(who === 'acting' || who.startsWith('roles.') ? nobody : unknown).push(path)
      continue
    }
    for (const target of targets) {
      const sheet = sheetOf(rules)(target)
      if (!sheet) {
        unknown.push(path)
        continue
      }
      const done = applyCharacter(
        sheet,
        target,
        { type: 'change', effects: { [rest]: change }, ...(time !== undefined && { time }) },
        { roller, context },
      )
      s.members = (s.members ?? []).map((m: CharacterState) =>
        m.id === target.id ? done.state : m,
      )
      for (const e of done.events) {
        events.push(e)
        if (e.type === 'LIMIT_REACHED')
          limits.push({
            path: `characters.${target.id}.values.${e.value}`,
            limit: e.limit,
            value: done.state.values[e.value],
          })
      }
    }
  }
  return { limits, events, nobody, unknown }
}

/**
 * A character as an OTD `character` entity: its values as `stats`, its tags, and what only
 * the character engine reads (its sheet, conditions, cards, relations) in `ext.character`.
 * `kind` says what it is in play (`pc` for the party's members).
 */
export function characterToOtd(
  member: CharacterState,
  kind = 'pc',
): {
  id: string
  type: 'character'
  name?: string
  kind: string
  tags?: string[]
  stats: Record<string, number>
  ext: { character: Record<string, unknown> }
} {
  return {
    id: member.id,
    type: 'character',
    ...(member.name !== undefined && { name: member.name }),
    kind,
    ...(member.tags.length && { tags: [...member.tags] }),
    stats: { ...member.values },
    ext: {
      character: {
        sheet: member.sheet,
        ...(Object.keys(member.conditions).length && { conditions: member.conditions }),
        ...(member.cards.length && { cards: member.cards }),
        ...(member.relations.length && { relations: member.relations }),
      },
    },
  }
}

/** An OTD character back as a character (undefined when it isn't one this engine made). */
export function characterFromOtd(raw: {
  id: string
  name?: string
  tags?: string[]
  stats?: Record<string, unknown>
  ext?: Record<string, unknown>
}): CharacterState | undefined {
  const own = raw.ext?.character as Record<string, unknown> | undefined
  if (!own || typeof own.sheet !== 'string') return undefined
  const values = Object.fromEntries(
    Object.entries(raw.stats ?? {}).flatMap(([k, v]) => {
      const n = typeof v === 'number' ? v : Number(v)
      return Number.isFinite(n) ? [[k, n]] : []
    }),
  )
  const record = (v: unknown) =>
    typeof v === 'object' && v !== null && !Array.isArray(v) ? (v as Record<string, never>) : {}
  return {
    id: raw.id,
    sheet: own.sheet,
    ...(raw.name !== undefined && { name: raw.name }),
    values,
    conditions: record(own.conditions),
    tags: Array.isArray(raw.tags) ? raw.tags.filter((t) => typeof t === 'string') : [],
    cards: Array.isArray(own.cards) ? own.cards.filter((c) => typeof c === 'string') : [],
    relations: Array.isArray(own.relations) ? (own.relations as CharacterState['relations']) : [],
  }
}

/**
 * The map as the trip sees it, with the members' relations to each hex: a relation to
 * `hex:<id>`, to the hex's region (`region:<name>`) or to a place in it (`poi:<id>`, when
 * the map lists its places as `pois`) is read there as `hex.related` (who) and
 * `hex.relations.<kind>` (who, by kind of relation).
 */
export function relatedWorld(
  world: TravelWorld,
  members: CharacterState[] | undefined,
): TravelWorld {
  const relations = (members ?? []).flatMap((m) => m.relations.map((r) => ({ who: m.id, ...r })))
  if (!relations.length) return world
  return {
    ...world,
    cell(hex) {
      const cell = world.cell(hex)
      if (!cell) return cell
      const pois = Array.isArray(cell.pois) ? (cell.pois as unknown[]) : []
      const here = relations.filter(
        (r) =>
          r.to === `hex:${hex}` ||
          (typeof cell.region === 'string' && r.to === `region:${cell.region}`) ||
          (r.to.startsWith('poi:') && pois.includes(r.to.slice(4))),
      )
      if (!here.length) return cell
      const byKind: Record<string, string[]> = {}
      for (const r of here) if (!(byKind[r.kind] ??= []).includes(r.who)) byKind[r.kind].push(r.who)
      return { ...cell, related: [...new Set(here.map((r) => r.who))], relations: byKind }
    },
  }
}
