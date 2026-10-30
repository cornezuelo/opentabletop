import {
  applyCharacter,
  characterFacts,
  createCharacter,
  membersBlock,
  partyValue,
  settleCharacter,
  shareItems,
  waitsForRoom,
  boundsOf,
  countOf,
  itemsFacts,
  type CharacterEvent,
  type CharacterState,
  type ItemLookup,
  type Sheet,
} from '@open-tabletop/character-engine'
import {
  hexIdOf,
  changeValue,
  momentRolls,
  resolveChange,
  tallyChange,
  type Bounds,
  type TravelState,
  type TravelWorld,
} from '@open-tabletop/travel-engine'
import type { Bindings } from './index'
import type { Effects, LimitReached } from './effects'
import { makePlace, PLACE_PATH, type MadePlace, type PlaceLookup } from './places'
import {
  changePresent,
  presentFacts,
  presentHere,
  PRESENT_PATH,
  type Present,
  type PresentEvent,
  type PresentRules,
} from './present'

/**
 * The party as its members: the sheet they're made with (the system's `sheet`), and what
 * the system's bindings say the party takes from them (stats `from` their values). A system without a sheet plays the party as a whole, as before. Beside
 * them, the party's own sheet (`partySheet`): the party itself as one character (`party`),
 * whatever its members, whose values stats may be (`from: { party: morale }`).
 */
export interface PartyRules extends PresentRules {
  sheet?: { id: string; def: Sheet }
  partySheet?: { id: string; def: Sheet }
  bindings?: Bindings
  /** The system's item catalogues: what an effect gives when a character has none yet. */
  items?: ItemLookup
  /** The ids of the items in those catalogues. */
  itemIds?: string[]
  /** The system's catalogues of places: what `hex.pois.<id>` makes. */
  places?: PlaceLookup
}

/** The id of the party's own character (made with the party sheet). */
export const PARTY_ID = 'party'

/** What the session keeps of the members (a trip's state has more). */
export interface PartyTarget {
  /** The party itself, a character of the system's party sheet (none without one). */
  party?: CharacterState
  members?: CharacterState[]
  /** The copies of templates the trip made, where each was made (docs/bestiary.md). */
  present?: Present[]
  acting?: string
  /** Who holds each of the system's journey roles (`roles.<id>.*`), by role id. */
  roles?: Record<string, string>
  /** Who rolls for the stats made of one character (`from: { pick }`); absent: the best. */
  rolls?: string
  /** What the party spends or gains of its items waits for the player to say who (**Ask who gives**). */
  askShare?: boolean
  /** What was shared out by the system's rule and waits for that answer, the first first. */
  sharing?: Sharing[]
  stats: Record<string, number>
  travel: Partial<Pick<TravelState, 'seed' | 'day' | 'location' | 'totals' | 'reached'>>
}

/**
 * What the party spent or gained of an item among its members, shared out by the system's
 * rule (`items.share`) and waiting for the player to confirm it or say who gives (or takes)
 * it instead: **Ask who gives**.
 */
export interface Sharing {
  item: string
  /** What the members gave (negative) or took, all together. */
  delta: number
  /** How the rule shared it out: what each member gave or took, by id. */
  moved: Record<string, number>
  time?: number
}

/** The sheet a member (the party itself, a copy of a template) is made with, when it's the system's. */
export const sheetOf =
  (rules: PartyRules) =>
  (member: CharacterState): Sheet | undefined =>
    rules.sheet && member.sheet === rules.sheet.id
      ? rules.sheet.def
      : rules.partySheet && member.sheet === rules.partySheet.id
        ? rules.partySheet.def
        : rules.sheets?.[member.sheet]

/** Whether the system has stats made of one character the player chooses (`from: { pick }`). */
export const picksWho = (rules: PartyRules): boolean =>
  Object.values(rules.bindings?.stats ?? {}).some((stat) => stat.from?.pick !== undefined)

/** The stats that are a value of the party sheet: `[stat, value]` pairs. */
export const partyStats = (rules: PartyRules): [string, string][] =>
  Object.entries(rules.bindings?.stats ?? {}).flatMap(([id, stat]) =>
    stat.from?.party ? [[id, stat.from.party] as [string, string]] : [],
  )

/**
 * Makes sure the party has its own character when the system has a party sheet (in place):
 * a new one with the sheet's defaults (and the stats it backs as they are), or none.
 */
function ensureParty(s: PartyTarget, rules: PartyRules): void {
  const own = rules.partySheet
  if (!own) {
    delete s.party
    return
  }
  if (s.party?.sheet === own.id) return
  const values = Object.fromEntries(
    partyStats(rules).flatMap(([stat, value]) =>
      s.stats[stat] !== undefined ? [[value, s.stats[stat]]] : [],
    ),
  )
  s.party = createCharacter(own.def, own.id, { id: PARTY_ID, values }, rules.items)
}

/** A new member of the system's sheet, with its defaults and `init`. */
export function newMember(
  rules: PartyRules,
  init: Partial<CharacterState> & { id: string },
): CharacterState {
  if (!rules.sheet) throw new Error('This system has no sheet for its members')
  return createCharacter(rules.sheet.def, rules.sheet.id, init, rules.items)
}

/**
 * A new party of the system's party sheet, with its defaults and `init` (`items: []` starts it
 * with nothing, instead of the sheet's `items.start`).
 */
export function newParty(
  rules: PartyRules,
  init: Partial<CharacterState> & { id: string },
): CharacterState {
  if (!rules.partySheet) throw new Error('This system has no party sheet')
  return createCharacter(rules.partySheet.def, rules.partySheet.id, init, rules.items)
}

const hasMembers = (s: PartyTarget): s is PartyTarget & { members: CharacterState[] } =>
  !!s.members?.length

/**
 * Brings the party up to date with its members (in place): the stats made of theirs.
 * Nothing changes for a party without members.
 */
export function refreshParty(s: PartyTarget, rules: PartyRules): void {
  ensureParty(s, rules)
  syncPartySheet(s, rules)
  if (!hasMembers(s)) return
  for (const [id, stat] of Object.entries(rules.bindings?.stats ?? {}))
    if (stat.from && !stat.from.party) s.stats[id] = partyValue(s.members, stat.from, s.rolls)
}

/**
 * The party sheet's values the stats are made of, as the stats are (in place), within the
 * sheet's bounds: whatever changed a stat (effects, the engine, a hand edit) is the value.
 * A hand edit of the party's sheet writes the stat too (`editPartySheet`).
 */
function syncPartySheet(s: PartyTarget, rules: PartyRules): void {
  const sheet = rules.partySheet?.def
  if (!s.party || !sheet) return
  for (const [stat, value] of partyStats(rules)) {
    if (!sheet.values[value]) continue
    // A value made of others: the stat is what it's made of, never the other way round.
    if (sheet.values[value].from !== undefined) {
      s.stats[stat] = s.party.values[value] ?? 0
      continue
    }
    const { min, max } = boundsOf(sheet, s.party, value)
    const at = s.stats[stat] ?? s.party.values[value]
    if (at === undefined) continue
    const to = Math.min(max ?? Infinity, Math.max(min ?? -Infinity, at))
    s.stats[stat] = to
    if (s.party.values[value] !== to)
      s.party = { ...s.party, values: { ...s.party.values, [value]: to } }
  }
}

/**
 * The party's own sheet changed by hand (in place): the stats made of its values follow,
 * and the party is brought up to date.
 */
export function editPartySheet(s: PartyTarget, rules: PartyRules, next: CharacterState): void {
  s.party = next
  for (const [stat, value] of partyStats(rules))
    if (next.values[value] !== undefined) s.stats[stat] = next.values[value]
  refreshParty(s, rules)
}

/**
 * What conditions and tables read of the party's items: its own and its members' together
 * (`party.items.ration.count`, `party.items.tags`).
 */
export function partyItems(
  s: Pick<PartyTarget, 'party' | 'members'>,
  /** The system's catalogues: each of their items is there, at a count of 0 when nobody has it. */
  rules: PartyRules = {},
): Record<string, unknown> {
  const all = [...(s.party?.items ?? []), ...(s.members ?? []).flatMap((m) => m.items ?? [])]
  const held = itemsFacts(undefined, { values: {}, items: all }).items
  const none = Object.fromEntries((rules.itemIds ?? []).map((id) => [id, { count: 0, tags: [] }]))
  return { ...none, ...held }
}

/**
 * The party's numbers a trip's totals count (`trip.spent.party.items.ration`), by full name:
 * its own sheet's values and its items (its own and its members' together).
 */
export function partyNumbers(
  s: Pick<PartyTarget, 'party' | 'members'>,
  rules: PartyRules,
): Record<string, number> {
  const out: Record<string, number> = {}
  for (const [id, n] of Object.entries(s.party?.values ?? {})) out[`party.values.${id}`] = n
  const ids = new Set([
    ...(rules.itemIds ?? []),
    ...[s.party, ...(s.members ?? [])].flatMap((c) => (c?.items ?? []).map((i) => i.id)),
  ])
  for (const id of ids)
    out[`party.items.${id}`] = [s.party, ...(s.members ?? [])].reduce(
      (n, c) => n + (c ? countOf(c, id) : 0),
      0,
    )
  return out
}

/**
 * The numbers the session keeps that an action's steps change, for the travel engine
 * (`kept`): the party sheet's values (those not made of others) with their bounds now, and
 * the party's items by id (read as their `count`, never under 0).
 */
export function keptNumbers(
  s: Pick<PartyTarget, 'party' | 'members'>,
  rules: PartyRules,
): Record<string, Bounds & { read?: string }> {
  const out: Record<string, Bounds & { read?: string }> = {}
  const sheet = rules.partySheet?.def
  if (s.party && sheet)
    for (const [id, value] of Object.entries(sheet.values))
      if (value.from === undefined) out[`party.values.${id}`] = boundsOf(sheet, s.party, id)
  for (const path of Object.keys(partyNumbers(s, rules)))
    if (path.startsWith('party.items.')) out[path] = { min: 0, read: `${path}.count` }
  return out
}

/** What the members' conditions block for the party (`party.blocked` for the travel engine). */
export function partyBlocks(
  s: PartyTarget,
  rules: PartyRules,
): Record<string, { value: string; who: string }> {
  // The party's own conditions block for it, then its members'.
  return membersBlock(sheetOf(rules), [...(s.party ? [s.party] : []), ...(s.members ?? [])])
}

/**
 * What conditions and tables read of the members: `characters.<id>.*` (each one's facts:
 * `characters.kael.values.health`, `characters.kael.conditions`…) and `acting.*` (the one
 * acting now, if any).
 */
export function memberFacts(
  s: Pick<PartyTarget, 'members' | 'acting' | 'roles' | 'present'> & {
    travel?: PartyTarget['travel']
  },
  /** Their sheets, for their items' places. */
  rules: PartyRules = {},
): Record<string, unknown> {
  // Those present (copies of templates here), read beside the members.
  const copies =
    s.present?.length || rules.templateIds?.length
      ? presentFacts({ present: s.present, travel: s.travel ?? {} }, rules)
      : undefined
  if (!s.members?.length)
    return copies
      ? {
          present: copies.present,
          ...(Object.keys(copies.characters).length && { characters: copies.characters }),
        }
      : {}
  const characters = {
    ...copies?.characters,
    ...Object.fromEntries(s.members.map((m) => [m.id, characterFacts(m, sheetOf(rules)(m))])),
  }
  const acting = s.acting !== undefined ? characters[s.acting] : undefined
  // Each journey role held, as its holder (`roles.guide.values.pathfinding`).
  const roles = Object.fromEntries(
    Object.entries(s.roles ?? {}).flatMap(([role, id]) =>
      characters[id] ? [[role, characters[id]]] : [],
    ),
  )
  return {
    characters,
    ...(copies && { present: copies.present }),
    ...(acting && { acting }),
    ...(Object.keys(roles).length && { roles }),
  }
}

/**
 * Who an effect's or a fact's path is about, and the rest: `party.members` (every member),
 * `characters.<id>`, `acting`, `roles.<id>` (whoever holds the role).
 */
export const MEMBER_PATH =
  /^(party\.members|party|characters\.[^.]+|acting|roles\.[^.]+)\.(values|conditions|items)\.(.+)$/

/** Whether an effect's path is about members (`party.members.…`, `characters.<id>.…`, `acting.…`). */
export const isMemberPath = (path: string): boolean =>
  MEMBER_PATH.exec(path)?.[1] !== undefined && MEMBER_PATH.exec(path)?.[1] !== 'party'

/** Whether an effect's path is about the party's own sheet (`party.values.…`, `party.conditions.…`). */
export const isPartySheetPath = (path: string): boolean => MEMBER_PATH.exec(path)?.[1] === 'party'

/**
 * Applies the effects on members: `party.members.values.health: -1` (every member),
 * `characters.<id>.…` (one), `acting.…` (the one acting) or `roles.<id>.…` (whoever holds
 * the role; nobody: `nobody`), and on the party's own sheet (`party.values.…`,
 * `party.conditions.…`). The party's items (`party.items.ration`) are its own and its
 * members' together: taken from its own first, then from the members as their sheet shares
 * them out (`items.share`); given to the members so, or to its own sheet without members.
 * Within each one's sheet; what hits a bound is in `limits` (by full name) and noted as the
 * trip's `below` / `above`, and what the party's values and items moved counts in the
 * trip's totals. Other paths are left alone, and so is everything for a party without
 * members or a sheet of its own.
 */
export function applyMemberEffects(
  s: PartyTarget,
  effects: Effects,
  rules: PartyRules,
  context: Record<string, unknown> = {},
  time?: number,
  /**
   * Whether what hits a bound is noted as the trip's `below` / `above`; not for an action's
   * steps, which the travel engine noted as they happened (its day may be over by now).
   */
  noteReached = true,
): {
  limits: LimitReached[]
  events: CharacterEvent[]
  nobody: string[]
  unknown: string[]
  /** Copies of templates that came or left (`present.<template>`). */
  present: PresentEvent[]
  /** Places made on the party's place (`hex.pois.<template>`), and the templates nobody has. */
  places: { at: string; place: MadePlace }[]
  unknownPlaces: string[]
} {
  const limits: LimitReached[] = []
  const events: CharacterEvent[] = []
  const nobody: string[] = []
  const unknown: string[] = []
  const present: PresentEvent[] = []
  const places: { at: string; place: MadePlace }[] = []
  const unknownPlaces: string[] = []
  // A party played as a whole, without a sheet of its own: only those present are changed.
  const whole = !s.members?.length && !s.party
  /** One copy by its id (`characters.wolf-2.…`), which a party played as a whole may change. */
  const copyPath = (path: string) => {
    const who = MEMBER_PATH.exec(path)?.[1]
    return (
      !!who?.startsWith('characters.') &&
      !!s.present?.some((p) => `characters.${p.character.id}` === who)
    )
  }
  if (
    whole &&
    !Object.keys(effects).some((p) => PRESENT_PATH.test(p) || PLACE_PATH.test(p) || copyPath(p))
  )
    return { limits, events, nobody, unknown, present, places, unknownPlaces }
  const { travel } = s
  const roller =
    travel.day !== undefined
      ? momentRolls(
          { seed: travel.seed, day: travel.day, location: travel.location ?? '' },
          hexIdOf(context),
          typeof context.moment === 'string' ? context.moment : undefined,
        )
      : undefined
  const before = partyNumbers(s, rules)
  /** Applies `rest` (`values.health`, `items.torch`) to one character, keeping what it did. */
  const applyTo = (target: CharacterState, rest: string, change: number | string): void => {
    const sheet = sheetOf(rules)(target)
    if (!sheet) return
    const done = applyCharacter(
      sheet,
      target,
      { type: 'change', effects: { [rest]: change }, ...(time !== undefined && { time }) },
      { roller, context, items: rules.items },
    )
    keep(target, done.state, done.events)
  }
  /** A character's new state in the party, with what happened to it. */
  const keep = (target: CharacterState, next: CharacterState, happened: CharacterEvent[]) => {
    const own = target.id === PARTY_ID && target === s.party
    if (own) {
      s.party = next
      // The values changed (the one written, and those made of it): the stats follow them.
      const moved = new Set(happened.flatMap((e) => (e.type === 'VALUE_CHANGED' ? [e.value] : [])))
      for (const [stat, value] of partyStats(rules))
        if (moved.has(value) && next.values[value] !== undefined) s.stats[stat] = next.values[value]
    } else if (s.present?.some((p) => p.character.id === target.id))
      s.present = s.present.map((p) =>
        p.character.id === target.id ? { ...p, character: next } : p,
      )
    else s.members = (s.members ?? []).map((m) => (m.id === target.id ? next : m))
    for (const e of happened) {
      events.push(e)
      if (e.type === 'LIMIT_REACHED')
        limits.push({
          path: own ? `party.values.${e.value}` : `characters.${target.id}.values.${e.value}`,
          limit: e.limit,
          value: next.values[e.value],
        })
    }
  }
  /** The party's items, its own and its members' together (`party.items.ration`). */
  const partyItem = (path: string, id: string, change: number | string): void => {
    const [item, field] = id.split('.', 2)
    const holders = [...(s.party ? [s.party] : []), ...(s.members ?? [])]
    // A field: the first one's, the party's own first.
    if (field !== undefined) {
      const first = holders.find((c) => countOf(c, item) > 0)
      if (first) applyTo(first, `items.${id}`, change)
      return
    }
    const have = holders.reduce((n, c) => n + countOf(c, item), 0)
    const { to, limit } = changeValue(have, resolveChange(change, context, roller), { min: 0 })
    if (limit) limits.push({ path, limit, value: to })
    let delta = to - have
    const carriers = (s.members ?? []).filter((m) => sheetOf(rules)(m)?.items !== undefined)
    // Spent: the party's own first.
    if (delta < 0 && s.party && countOf(s.party, item) > 0) {
      const taken = Math.min(countOf(s.party, item), -delta)
      applyTo(s.party, `items.${item}`, -taken)
      delta += taken
    }
    if (!delta) return
    if (!carriers.length) {
      if (s.party) applyTo(s.party, `items.${item}`, delta)
      return
    }
    const shared = shareItems(
      sheetOf(rules),
      s.members ?? [],
      item,
      delta,
      rules.sheet?.def.items?.share,
      { items: rules.items, ...(time !== undefined && { time }) },
    )
    s.members = shared.members
    events.push(...shared.events)
    // A gain nobody had room for is left behind.
    if (delta > 0 && shared.left > 0)
      events.push({ type: 'ITEM_LEFT', character: PARTY_ID, item, count: shared.left })
    // Asking who gives: only when more than one could, and something was shared out.
    const given = Object.values(shared.moved).reduce((n, m) => n + m, 0)
    if (s.askShare && carriers.length > 1 && given)
      s.sharing = [
        ...(s.sharing ?? []),
        { item, delta: given, moved: shared.moved, ...(time !== undefined && { time }) },
      ]
  }
  for (const [path, change] of Object.entries(effects)) {
    // Places made on the party's place: as many as the change says (the host writes them).
    const placeId = PLACE_PATH.exec(path)?.[1]
    if (placeId !== undefined) {
      if (typeof change === 'boolean') continue
      const count = Math.max(
        0,
        Math.floor(changeValue(0, resolveChange(change, context, roller)).to),
      )
      if (!count) continue
      const read = { ...context, ...(time !== undefined && { time }) }
      const made = makePlace(placeId, rules.places, read, rules.locale ?? 'en', roller)
      if (!made) {
        unknownPlaces.push(placeId)
        continue
      }
      for (let i = 0; i < count; i++) places.push({ at: travel.location ?? '', place: made })
      continue
    }
    // Those present: a template's copies made or taken away, or each of them changed.
    const [, template, copyPart, copyRest] = PRESENT_PATH.exec(path) ?? []
    if (template !== undefined) {
      if (typeof change === 'boolean') continue
      if (!copyPart) {
        present.push(...changePresent(s, rules, template, change, context))
        continue
      }
      const copies = presentHere(s).filter(
        (p) => template === 'all' || p.character.template?.id === template,
      )
      for (const p of copies) {
        const now = s.present!.find((c) => c.character.id === p.character.id)!.character
        applyTo(now, `${copyPart}.${copyRest}`, change)
      }
      continue
    }
    if (whole && !copyPath(path)) continue
    const [, who, part, id] = MEMBER_PATH.exec(path) ?? []
    if (!who) continue
    if (who === 'party' && part === 'items') {
      if (typeof change === 'boolean') continue
      partyItem(path, id, change)
      continue
    }
    const rest = `${part}.${id}`
    const members: CharacterState[] = s.members ?? []
    /** A member by id, or a copy of a template the trip made. */
    const characterById = (wanted: string): CharacterState[] => {
      const member = members.filter((m) => m.id === wanted)
      if (member.length) return member
      const copy = s.present?.find((p) => p.character.id === wanted)
      return copy ? [copy.character] : []
    }
    const holder = who.startsWith('roles.') ? s.roles?.[who.slice('roles.'.length)] : undefined
    const targets: CharacterState[] =
      who === 'party'
        ? s.party
          ? [s.party]
          : []
        : who === 'party.members'
          ? members
          : who === 'acting'
            ? members.filter((m) => m.id === s.acting)
            : who.startsWith('roles.')
              ? members.filter((m) => m.id === holder)
              : characterById(who.slice('characters.'.length))
    if (!targets.length) {
      // Nobody acting, or nobody holding the role: nothing happens, and the journal says so.
      ;(who === 'acting' || who.startsWith('roles.') ? nobody : unknown).push(path)
      continue
    }
    for (const target of targets) {
      if (!sheetOf(rules)(target)) {
        unknown.push(path)
        continue
      }
      // Each one as it is now (an earlier effect may have changed it).
      const now =
        target.id === PARTY_ID && who === 'party'
          ? s.party!
          : ((s.members ?? []).find((m) => m.id === target.id) ??
            s.present?.find((p) => p.character.id === target.id)?.character ??
            target)
      applyTo(now, rest, change)
    }
  }
  // What hit a bound today, by full name (`trip.below: party.values.food`).
  for (const { path, limit } of noteReached ? limits : []) {
    const key = limit === 'min' ? 'below' : 'above'
    const list = travel.reached?.[key] ?? []
    if (!list.includes(path)) travel.reached = { ...travel.reached, [key]: [...list, path] }
  }
  // What the party's values and items moved, in the trip's totals (`trip.spent.…`).
  const after = partyNumbers(s, rules)
  for (const path of new Set([...Object.keys(before), ...Object.keys(after)]))
    tallyChange(travel, path, before[path] ?? 0, after[path] ?? 0)
  return { limits, events, nobody, unknown, present, places, unknownPlaces }
}

/**
 * The party's sheet and its members with what holds by itself settled in the `world` (the
 * trip's facts now): conditions that read it (`when: { trip.mode: boat }`) set or cleared,
 * as of `time`. In place; the stats made of the party's values follow. What changed, in order.
 */
export function settleStates(
  s: PartyTarget,
  rules: PartyRules,
  world: Record<string, unknown>,
  time?: number,
): CharacterEvent[] {
  const events: CharacterEvent[] = []
  const options = { world, ...(time !== undefined && { time }) }
  if (s.party && rules.partySheet?.def) {
    const done = settleCharacter(rules.partySheet.def, s.party, options)
    if (done.events.length) {
      s.party = done.state
      events.push(...done.events)
      syncPartySheet(s, rules)
    }
  }
  if (s.members?.length)
    s.members = s.members.map((m) => {
      const sheet = sheetOf(rules)(m)
      if (!sheet) return m
      const done = settleCharacter(sheet, m, options)
      events.push(...done.events)
      return done.events.length ? done.state : m
    })
  return events
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
        ...(member.items?.length && { items: member.items }),
        ...(member.places && { places: member.places }),
        ...(member.template && { template: member.template }),
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
    ...(Array.isArray(own.items) && { items: own.items as CharacterState['items'] }),
    ...(typeof own.places === 'object' &&
      own.places !== null &&
      !Array.isArray(own.places) && { places: own.places as CharacterState['places'] }),
    ...(isTemplateRef(own.template) && { template: own.template }),
  }
}

/** A copy's template as kept (`{ id, from }`). */
const isTemplateRef = (v: unknown): v is NonNullable<CharacterState['template']> =>
  typeof v === 'object' &&
  v !== null &&
  typeof (v as { id?: unknown }).id === 'string' &&
  typeof (v as { from?: unknown }).from === 'string'

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

/**
 * Who has items waiting for room (`full: ask`: given with none left): the party's own first,
 * then the members, by id. The trip waits until room is made for them on their cards.
 */
export function waitingForRoom(s: Pick<PartyTarget, 'party' | 'members'>): string[] {
  return [...(s.party ? [s.party] : []), ...(s.members ?? [])].filter(waitsForRoom).map((c) => c.id)
}

/**
 * What each member could give of the first share waiting (`sharing`), or take: what they
 * carry now plus what the rule took from them. Undefined when nothing waits.
 */
export function sharingRoom(
  s: Pick<PartyTarget, 'members' | 'sharing'>,
  rules: PartyRules,
): Record<string, number> | undefined {
  const first = s.sharing?.[0]
  if (!first) return undefined
  return Object.fromEntries(
    (s.members ?? [])
      .filter((m) => sheetOf(rules)(m)?.items !== undefined)
      .map((m) => [m.id, countOf(m, first.item) - (first.moved[m.id] ?? 0)]),
  )
}

/**
 * Answers the first share waiting (in place): `moved` is what each member gives (negative)
 * or takes instead of what the rule said (absent: the rule's stands). It must add up to
 * the same, each one giving no more than they could. Undefined when it can't be done.
 */
export function answerSharing(
  s: PartyTarget,
  rules: PartyRules,
  moved?: Record<string, number>,
  time?: number,
): { sharing: Sharing; moved: Record<string, number>; events: CharacterEvent[] } | undefined {
  const first = s.sharing?.[0]
  if (!first) return undefined
  const chosen = moved ?? first.moved
  const room = sharingRoom(s, rules) ?? {}
  const total = Object.values(chosen).reduce((n, m) => n + m, 0)
  const fits = Object.entries(chosen).every(
    ([id, n]) =>
      id in room && Number.isInteger(n) && (first.delta < 0 ? n <= 0 && -n <= room[id] : n >= 0),
  )
  if (total !== first.delta || !fits) return undefined
  const events: CharacterEvent[] = []
  s.members = (s.members ?? []).map((m) => {
    const change = (chosen[m.id] ?? 0) - (first.moved[m.id] ?? 0)
    const sheet = sheetOf(rules)(m)
    if (!change || !sheet) return m
    const done = applyCharacter(
      sheet,
      m,
      {
        type: 'change',
        effects: { [`items.${first.item}`]: change },
        ...(time !== undefined && { time }),
      },
      { items: rules.items },
    )
    events.push(...done.events)
    return done.state
  })
  s.sharing = s.sharing!.slice(1)
  if (!s.sharing.length) delete s.sharing
  const kept = Object.fromEntries(Object.entries(chosen).filter(([, n]) => n))
  return { sharing: first, moved: kept, events }
}
