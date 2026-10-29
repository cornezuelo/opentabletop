import type { CharacterState } from '@open-tabletop/character-engine'
import { characterFromOtd, characterToOtd } from './party'

/**
 * The roster: the characters this browser keeps, of any system, that the player made in the
 * Characters app or kept from a trip or a token (docs/characters-app.md). A trip or token
 * keeps its own copy of a character; the copy is **linked** while the roster says the
 * character plays there (`playing`), and a character plays in one place at a time.
 * Plain functions: the hosts read and write the roster where they keep it.
 */
export interface Roster {
  characters: RosterEntry[]
}

export interface RosterEntry {
  character: CharacterState
  /** When it last changed (ISO time). */
  modified: string
  /** Its page in the player's notes app. */
  noteRef?: string
  /** Where it plays now (absent: nowhere, only in the roster). */
  playing?: RosterPlace
  /**
   * A party (a character of its system's party sheet): the ids of the roster characters in it,
   * in order (docs/characters-app.md §8). Absent: a character, not a party. A character is in
   * one party at a time.
   */
  members?: string[]
}

/** A trip or token a roster character plays in, or a campaign it's in without a trip. */
export interface RosterPlace {
  /** The app that keeps it (`hexmapper`, `travel`; `campaign`: in a campaign, without a trip). */
  app: string
  /** The map's or trip's id. */
  id: string
  /** On a map: the token whose sheet it is (absent: a member of the map's trip). */
  token?: string
  /** What the place is called, to say where a character is (the map's or trip's name). */
  name: string
}

export const emptyRoster = (): Roster => ({ characters: [] })

/**
 * A campaign as a place (a quick game: in it without a trip or token, docs/campaigns.md §11):
 * its cast has them, and a new trip of it offers its party.
 */
export const campaignPlace = (id: string, name: string): RosterPlace => ({
  app: 'campaign',
  id,
  name,
})

/**
 * Puts a roster character in a campaign without a trip (`place`), or takes it out (none); a
 * party takes its members with it. Each leaves where it played (the host asks first: that
 * place keeps its copy, no longer linked). The ids of those that were playing elsewhere
 * come back too, to say so.
 */
export function putInCampaign(
  roster: Roster,
  id: string,
  place: RosterPlace | undefined,
  now: string,
): Roster {
  const entry = rosterEntry(roster, id)
  if (!entry) return roster
  let next = roster
  for (const who of [id, ...(entry.members ?? [])]) {
    const e = rosterEntry(next, who)
    if (!e) continue
    if (place) next = takeFromRoster(next, who, place, now)?.roster ?? next
    else if (e.playing?.app === 'campaign') {
      const rest = { ...e, modified: now }
      delete rest.playing
      next = replace(next, who, rest)
    }
  }
  return next
}

/** Who a party or character's putting somewhere would take from a trip or token (the host asks first). */
export const takenFromPlay = (roster: Roster, id: string): RosterEntry[] => {
  const entry = rosterEntry(roster, id)
  if (!entry) return []
  return [id, ...(entry.members ?? [])].flatMap((who) => {
    const e = rosterEntry(roster, who)
    return e?.playing && e.playing.app !== 'campaign' ? [e] : []
  })
}

/** The roster party in a campaign without a trip, of a sheet, if any (what a new trip of it offers). */
export const partyInCampaign = (
  roster: Roster,
  campaign: string,
  sheet: string,
): RosterEntry | undefined =>
  roster.characters.find(
    (e) =>
      e.members &&
      e.character.sheet === sheet &&
      e.playing?.app === 'campaign' &&
      e.playing.id === campaign,
  )

export const samePlace = (a: RosterPlace | undefined, b: RosterPlace): boolean =>
  !!a && a.app === b.app && a.id === b.id && (a.token ?? '') === (b.token ?? '')

/** An id from a name (`Old Mara` → `old-mara`), not one of `taken` (`old-mara-2`…). */
export function characterId(name: string, taken: Iterable<string>): string {
  const used = new Set(taken)
  const base =
    name
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'character'
  let id = base
  for (let n = 2; used.has(id); n++) id = `${base}-${n}`
  return id
}

export const rosterEntry = (roster: Roster, id: string): RosterEntry | undefined =>
  roster.characters.find((e) => e.character.id === id)

/** Whether a roster entry is a party (its sheet and its members). */
export const isParty = (entry: RosterEntry | undefined): boolean => !!entry?.members

/** The party a roster character is in, if any. */
export const partyWith = (roster: Roster, id: string): RosterEntry | undefined =>
  roster.characters.find((e) => e.members?.includes(id))

/**
 * A party's members set (the Characters app, or the trip it plays in): each one leaves the
 * party it was in. The same roster when nothing changed.
 */
export function setMembers(roster: Roster, party: string, ids: string[], now: string): Roster {
  const entry = rosterEntry(roster, party)
  if (!entry?.members) return roster
  const wanted = [...new Set(ids)].filter((id) => id !== party && rosterEntry(roster, id))
  const moving = new Set(wanted)
  let changed = JSON.stringify(entry.members) !== JSON.stringify(wanted)
  const characters = roster.characters.map((e) => {
    if (e === entry) return changed ? { ...e, members: wanted, modified: now } : e
    if (!e.members?.some((id) => moving.has(id))) return e
    changed = true
    return { ...e, members: e.members.filter((id) => !moving.has(id)), modified: now }
  })
  return changed ? { characters } : roster
}

/** Whether a place's copy of a character is the roster's (the roster says it plays there). */
export const isLinked = (roster: Roster, id: string, place: RosterPlace): boolean =>
  samePlace(rosterEntry(roster, id)?.playing, place)

/**
 * Keeps a character in the roster. Its id stays when the roster doesn't have it; otherwise it
 * gets a new one (the place renames its copy: `renameMember`). With a place, it plays there.
 */
export function keepInRoster(
  roster: Roster,
  character: CharacterState,
  now: string,
  place?: RosterPlace,
): { roster: Roster; id: string } {
  const id = rosterEntry(roster, character.id)
    ? characterId(
        character.name || character.id,
        roster.characters.map((e) => e.character.id),
      )
    : character.id
  const entry: RosterEntry = {
    character: structuredClone({ ...character, id }),
    modified: now,
    ...(place && { playing: place }),
  }
  return { roster: { characters: [...roster.characters, entry] }, id }
}

/**
 * Keeps a party in the roster: its sheet (`party`, named `name`) and its members (roster
 * ids; each leaves the party it was in). Its id comes from its name. With a place, it plays there.
 */
export function keepPartyInRoster(
  roster: Roster,
  party: CharacterState,
  name: string,
  members: string[],
  now: string,
  place?: RosterPlace,
): { roster: Roster; id: string } {
  const id = characterId(
    name,
    roster.characters.map((e) => e.character.id),
  )
  const entry: RosterEntry = {
    character: structuredClone({ ...party, id, name }),
    modified: now,
    members: [],
    ...(place && { playing: place }),
  }
  return { roster: setMembers({ characters: [...roster.characters, entry] }, id, members, now), id }
}

/**
 * Takes a roster character to a place: it plays there from now on, and the place keeps a
 * copy. `from` is where it played before (the host asks first; that copy is no longer linked).
 */
export function takeFromRoster(
  roster: Roster,
  id: string,
  place: RosterPlace,
  now: string,
): { roster: Roster; character: CharacterState; from?: RosterPlace } | undefined {
  const entry = rosterEntry(roster, id)
  if (!entry) return undefined
  const from = entry.playing && !samePlace(entry.playing, place) ? entry.playing : undefined
  return {
    roster: replace(roster, id, { ...entry, playing: place, modified: now }),
    character: structuredClone(entry.character),
    ...(from && { from }),
  }
}

/**
 * Writes a place's copies of its linked characters back to the roster (after a step or an
 * edit). Unlinked copies are left alone. The same roster when nothing changed.
 */
export function syncToRoster(
  roster: Roster,
  characters: CharacterState[],
  place: RosterPlace,
  now: string,
): Roster {
  let next = roster
  for (const c of characters) {
    const entry = rosterEntry(next, c.id)
    if (!entry || !samePlace(entry.playing, place)) continue
    if (JSON.stringify(entry.character) === JSON.stringify(c)) continue
    next = replace(next, c.id, { ...entry, character: structuredClone(c), modified: now })
  }
  return next
}

/**
 * A place's copies brought up to date from the roster (when it opens: the Characters app may
 * have changed them). `updated` lists the ids that changed, to tell the player.
 */
export function pullFromRoster(
  roster: Roster,
  characters: CharacterState[],
  place: RosterPlace,
): { characters: CharacterState[]; updated: string[] } {
  const updated: string[] = []
  const out = characters.map((c) => {
    const entry = rosterEntry(roster, c.id)
    if (!entry || !samePlace(entry.playing, place)) return c
    if (JSON.stringify(entry.character) === JSON.stringify(c)) return c
    updated.push(c.id)
    return structuredClone(entry.character)
  })
  return { characters: updated.length ? out : characters, updated }
}

/**
 * The characters that leave a place (taken out of the trip, the token deleted, the trip
 * deleted): they stay in the roster, playing nowhere. Without `ids`, every one there.
 */
export function leavePlace(roster: Roster, place: RosterPlace, ids?: string[]): Roster {
  let changed = false
  const characters = roster.characters.map((e) => {
    if (!samePlace(e.playing, place) || (ids && !ids.includes(e.character.id))) return e
    changed = true
    const rest = { ...e }
    delete rest.playing
    return rest
  })
  return changed ? { characters } : roster
}

/** The roster characters that play at a place. */
export const playingAt = (roster: Roster, place: RosterPlace): RosterEntry[] =>
  roster.characters.filter((e) => samePlace(e.playing, place))

/**
 * A place after any change: its linked copies written back (`syncToRoster`), the characters
 * it no longer has leaving it (a member taken out, a token deleted or without its sheet), and
 * its name kept up to date. The same roster when nothing changed.
 */
export function settlePlace(
  roster: Roster,
  characters: CharacterState[],
  place: RosterPlace,
  now: string,
): Roster {
  let next = syncToRoster(roster, characters, place, now)
  const here = new Set(characters.map((c) => c.id))
  const gone = playingAt(next, place)
    .filter((e) => !here.has(e.character.id))
    .map((e) => e.character.id)
  if (gone.length) next = leavePlace(next, place, gone)
  if (playingAt(next, place).some((e) => e.playing!.name !== place.name))
    next = {
      characters: next.characters.map((e) =>
        samePlace(e.playing, place) && e.playing!.name !== place.name
          ? { ...e, playing: { ...e.playing!, name: place.name } }
          : e,
      ),
    }
  return next
}

/** Changes a roster character (the Characters app). */
export function editInRoster(
  roster: Roster,
  id: string,
  change: (entry: RosterEntry) => RosterEntry,
  now: string,
): Roster {
  const entry = rosterEntry(roster, id)
  if (!entry) return roster
  const next = change(structuredClone(entry))
  return replace(roster, id, { ...next, character: { ...next.character, id }, modified: now })
}

/** A copy of a roster character, with a new id and name, playing nowhere (a party's, without members: a character is in one party at a time). */
export function duplicateInRoster(
  roster: Roster,
  id: string,
  name: string,
  now: string,
): { roster: Roster; id: string } {
  const entry = rosterEntry(roster, id)
  if (!entry) return { roster, id }
  const copy = characterId(
    name,
    roster.characters.map((e) => e.character.id),
  )
  const character = { ...structuredClone(entry.character), id: copy, name }
  const added: RosterEntry = {
    character,
    modified: now,
    ...(entry.noteRef && { noteRef: entry.noteRef }),
    ...(entry.members && { members: [] }),
  }
  return { roster: { characters: [...roster.characters, added] }, id: copy }
}

/**
 * Removes a character from the roster (and from its party); the place it played in keeps its
 * copy, unlinked. A party's members stay in the roster, in no party.
 */
export const deleteFromRoster = (roster: Roster, id: string): Roster => ({
  characters: roster.characters
    .filter((e) => e.character.id !== id)
    .map((e) =>
      e.members?.includes(id) ? { ...e, members: e.members.filter((m) => m !== id) } : e,
    ),
})

/**
 * How a party splits (**Split the party**): who goes, and what each side keeps of its values
 * and items. Nothing is made out of nothing: the player says both sides' numbers.
 */
export interface PartySplit {
  /** The new party's name. */
  name: string
  /** The members who go (ids of the party's). */
  members: string[]
  /** The new party as any new party of its sheet starts (its starting values, no items). */
  start: CharacterState
  /** Each value as it stays and as it goes (absent: the old one keeps it, the new one starts at its own). */
  values: Record<string, { stays: number; goes: number }>
  /** How many of each item (by `key`) go; what's inside an item that goes whole goes with it. */
  items: Record<string, number>
}

/**
 * Splits a party (it plays nowhere): a new party with the members who go, the values and items
 * the split gives it, playing nowhere; the old one keeps the rest. Its id.
 */
export function splitParty(
  roster: Roster,
  id: string,
  split: PartySplit,
  now: string,
): { roster: Roster; id: string } {
  const entry = rosterEntry(roster, id)
  if (!entry?.members) return { roster, id }
  const stays = structuredClone(entry.character)
  const goes = structuredClone(split.start)
  for (const [value, { stays: kept, goes: gone }] of Object.entries(split.values)) {
    stays.values[value] = kept
    goes.values[value] = gone
  }
  const items = stays.items ?? []
  const keys = new Set(items.map((i) => i.key))
  // Whole items going, and what they hold (inside them, at any depth).
  const whole = new Set(
    items.filter((i) => (split.items[i.key] ?? 0) >= i.count && i.count > 0).map((i) => i.key),
  )
  const inside = (i: (typeof items)[number]): boolean => {
    for (let at = i.place, n = 0; at && keys.has(at) && n < items.length; n++) {
      if (whole.has(at)) return true
      at = items.find((x) => x.key === at)?.place
    }
    return false
  }
  const kept: typeof items = []
  const moved: typeof items = []
  for (const item of items) {
    if (inside(item)) {
      moved.push(item)
      continue
    }
    const n = Math.min(item.count, Math.max(0, split.items[item.key] ?? 0))
    if (n >= item.count && item.count > 0) moved.push(item)
    else if (n > 0) {
      kept.push({ ...item, count: item.count - n })
      moved.push({ ...structuredClone(item), count: n })
    } else kept.push(item)
  }
  stays.items = kept
  goes.items = moved
  if (!kept.length) delete stays.items
  if (!moved.length) delete goes.items
  const made = keepPartyInRoster(
    { characters: roster.characters },
    goes,
    split.name,
    split.members.filter((m) => entry.members!.includes(m)),
    now,
  )
  const next = replace(made.roster, id, {
    ...rosterEntry(made.roster, id)!,
    character: stays,
    modified: now,
  })
  return { roster: next, id: made.id }
}

/**
 * Renames a trip's member everywhere the trip names it: who acts, the roles, who rolls and
 * the other members' relations (`character:<id>`). Changes `s` in place.
 */
export function renameMember(
  s: {
    members?: CharacterState[]
    acting?: string
    roles?: Record<string, string>
    rolls?: string
  },
  from: string,
  to: string,
): void {
  if (from === to) return
  s.members = (s.members ?? []).map((m) => (m.id === from ? { ...m, id: to } : m))
  if (s.acting === from) s.acting = to
  if (s.rolls === from) s.rolls = to
  for (const [role, holder] of Object.entries(s.roles ?? {}))
    if (holder === from) s.roles![role] = to
  for (const m of s.members)
    for (const r of m.relations) if (r.to === `character:${from}`) r.to = `character:${to}`
}

function replace(roster: Roster, id: string, entry: RosterEntry): Roster {
  return { characters: roster.characters.map((e) => (e.character.id === id ? entry : e)) }
}

/** A roster as stored (any version), read safely: what isn't a character is left out. */
export function readRoster(raw: unknown): Roster {
  const list = (raw as { characters?: unknown } | null)?.characters
  if (!Array.isArray(list)) return emptyRoster()
  const characters: RosterEntry[] = []
  const seen = new Set<string>()
  for (const item of list) {
    const e = item as Partial<RosterEntry> | null
    const c = e?.character as Partial<CharacterState> | undefined
    if (typeof c?.id !== 'string' || typeof c.sheet !== 'string' || seen.has(c.id)) continue
    seen.add(c.id)
    const playing = e!.playing
    characters.push({
      character: {
        ...(c as CharacterState),
        values: c.values ?? {},
        conditions: c.conditions ?? {},
        tags: c.tags ?? [],
        cards: c.cards ?? [],
        relations: c.relations ?? [],
      },
      modified: typeof e!.modified === 'string' ? e!.modified : new Date(0).toISOString(),
      ...(typeof e!.noteRef === 'string' && { noteRef: e!.noteRef }),
      ...(playing &&
        typeof playing.app === 'string' &&
        typeof playing.id === 'string' && { playing }),
      ...(Array.isArray(e!.members) && {
        members: e!.members.filter((m): m is string => typeof m === 'string'),
      }),
    })
  }
  return { characters }
}

/** OTD's version the roster's files are written in (`@open-tabletop/schema`'s). */
const OTD = '0.2.0'

/** Roster characters as an OTD bundle (`characters`, with their notes), to save as a file. */
export function rosterToOtd(entries: RosterEntry[]): {
  otd: string
  characters: (ReturnType<typeof characterToOtd> & { noteRef?: string })[]
} {
  return {
    otd: OTD,
    characters: entries.map((e) => ({
      ...characterToOtd(e.character, 'pc'),
      ...(e.noteRef && { noteRef: e.noteRef }),
    })),
  }
}

/**
 * The characters of an OTD bundle (one the roster wrote, a map's party…), with their notes:
 * those this engine made (their sheet in `ext.character`), the rest left out.
 */
export function rosterFromOtd(raw: unknown): { character: CharacterState; noteRef?: string }[] {
  const list = (raw as { characters?: unknown } | null)?.characters
  if (!Array.isArray(list)) return []
  return list.flatMap((item) => {
    const c = item as Parameters<typeof characterFromOtd>[0] & { noteRef?: unknown }
    if (typeof c?.id !== 'string') return []
    const character = characterFromOtd(c)
    if (!character) return []
    return [{ character, ...(typeof c.noteRef === 'string' && { noteRef: c.noteRef }) }]
  })
}
