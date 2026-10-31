import {
  characterFacts,
  copyOf,
  settleCharacter,
  type CharacterEvent,
  type CharacterState,
  type ItemLookup,
  type Sheet,
  type TemplateLookup,
} from '@open-tabletop/character-engine'
import {
  changeValue,
  momentRolls,
  resolveChange,
  type TravelState,
} from '@open-tabletop/travel-engine'
import { momentRoller } from '@open-tabletop/variables'

/**
 * Those present (docs/bestiary.md): the copies of templates a trip made, each kept where
 * it was made (the party's place then). Those at the party's place now are what tables,
 * conditions and effects see; what becomes of the others is each template's `behind`.
 */
export interface Present {
  character: CharacterState
  /** Where it was made: the trip's location then (a hex, or the way's place). */
  at: string
  /** Gone once the party leaves its place (the template's `behind: leave`); absent: it stays. */
  behind?: 'leave'
}

/** What the session needs of a system to make and keep copies. */
export interface PresentRules {
  /** The system's templates by id. */
  bestiary?: TemplateLookup
  /** Their ids, for reads (`present.<id>.count` is 0 when none is here). */
  templateIds?: string[]
  /** A template's sheet (`pack/id`), by its bestiary's full id and its id. */
  templateSheet?: (bestiary: string, template: string) => string | undefined
  /** The sheets copies are made with, by `pack/id`. */
  sheets?: Record<string, Sheet>
  /** The system's catalogues, for what a template carries. */
  items?: ItemLookup
  /** What a template's `names` rolls (`pack/generator.id`), by its bestiary's full id and its id. */
  templateNames?: (bestiary: string, template: string) => string | undefined
  /** Rolls what `names` names for a copy's name; none: the template's, numbered. */
  nameFrom?: (ref: string, context: Record<string, unknown>) => string | undefined
  /** The language template names are read in for a copy's name. */
  locale?: string
}

/** What happened to those present, for the journal. */
export type PresentEvent =
  | { type: 'PRESENT_CAME'; template: string; ids: string[]; names: string[] }
  | {
      type: 'PRESENT_LEFT'
      id: string
      name?: string
      template?: string
      /** A condition of its sheet that `leaves`, the party leaving it behind, an effect or the player. */
      because: 'condition' | 'behind' | 'effect' | 'hand'
      condition?: string
      /** That condition's name, in the language copies are named in. */
      conditionName?: string
    }
  | { type: 'PRESENT_MOVED'; id: string; name: string; at: string }
  | { type: 'UNKNOWN_TEMPLATE'; template: string }

interface PresentTarget {
  party?: CharacterState
  members?: CharacterState[]
  present?: Present[]
  travel: Partial<Pick<TravelState, 'seed' | 'day' | 'location'>>
}

/**
 * A path about those present: a template's copies here (`present.grey-wolf`, to make and
 * count them), and every one of them, or every copy here (`present.all`), with what it
 * changes (`present.grey-wolf.values.health`).
 */
export const PRESENT_PATH = /^present\.([^.]+)(?:\.(values|conditions|items)\.(.+))?$/

/** The copies at the party's place now. */
export const presentHere = (s: Pick<PresentTarget, 'present' | 'travel'>): Present[] =>
  (s.present ?? []).filter((p) => p.at === s.travel.location)

/** The sheet a copy is made with, when the system has it. */
export const copySheet =
  (rules: PresentRules) =>
  (c: CharacterState): Sheet | undefined =>
    rules.sheets?.[c.sheet]

/** An id for a new copy from its template's (`grey-wolf`, `grey-wolf-2`…), none of `taken`. */
function newId(base: string, taken: Set<string>): string {
  if (!taken.has(base)) return base
  for (let n = 2; ; n++) if (!taken.has(`${base}-${n}`)) return `${base}-${n}`
}

const textOf = (text: unknown, locale?: string): string | undefined =>
  typeof text === 'string'
    ? text
    : typeof text === 'object' && text !== null
      ? ((locale && (text as Record<string, string>)[locale]) ??
        Object.values(text as Record<string, string>)[0])
      : undefined

/**
 * Makes or takes away copies of a template at the party's place (in place): `change` as an
 * effect writes it (`3`, `'{{wolves}}'`, `-1`, `'=0'`), read with `context`. New copies roll
 * their own values (each with rolls of its own); taking away takes the last that came.
 */
export function changePresent(
  s: PresentTarget,
  rules: PresentRules,
  id: string,
  change: number | string,
  context: Record<string, unknown> = {},
): PresentEvent[] {
  const found = rules.bestiary?.(id)
  const sheetId = found && rules.templateSheet?.(found.bestiary, id)
  const sheet = sheetId ? rules.sheets?.[sheetId] : undefined
  if (!found || !sheetId || !sheet) return [{ type: 'UNKNOWN_TEMPLATE', template: id }]
  const at = s.travel.location ?? ''
  const day = s.travel.day ?? 0
  const roll = (key: string) =>
    momentRolls(
      { seed: `${s.travel.seed ?? ''}|${key}`, day, location: at },
      at,
      typeof context.moment === 'string' ? context.moment : undefined,
    )
  const here = presentHere(s).filter((p) => p.character.template?.id === id)
  const { to } = changeValue(here.length, resolveChange(change, context, roll('')), { min: 0 })
  const events: PresentEvent[] = []
  if (to < here.length) {
    const gone = new Set(here.slice(to).map((p) => p.character.id))
    s.present = (s.present ?? []).filter((p) => !gone.has(p.character.id))
    for (const p of here.slice(to)) events.push(left(p, 'effect'))
    return events
  }
  if (to === here.length) return events
  const { template } = found
  const taken = new Set([
    ...(s.party ? [s.party.id] : []),
    ...(s.members ?? []).map((m) => m.id),
    ...(s.present ?? []).map((p) => p.character.id),
  ])
  const base = textOf(template.name, rules.locale) ?? id
  const made: Present[] = []
  for (let n = here.length; n < to; n++) {
    const copyId = newId(id, taken)
    taken.add(copyId)
    const suffix = copyId === id ? '' : ` ${copyId.slice(id.length + 1)}`
    const names = rules.templateNames?.(found.bestiary, id)
    const name = (names && rules.nameFrom?.(names, context)) || `${base}${suffix}`
    const character = copyOf(
      sheet,
      sheetId,
      template,
      { id: copyId, name, from: found.bestiary },
      { roller: roll(copyId), context, items: rules.items },
    )
    made.push({ character, at, ...(template.behind === 'leave' && { behind: 'leave' as const }) })
  }
  s.present = [...(s.present ?? []), ...made]
  events.push({
    type: 'PRESENT_CAME',
    template: id,
    ids: made.map((p) => p.character.id),
    names: made.map((p) => p.character.name ?? p.character.id),
  })
  return events
}

/**
 * A copy of a template made outside a trip (a token placed on a map from the bestiary):
 * its values rolled with rolls of its own, seeded by `seed`; undefined when the system has
 * no such template or its sheet.
 */
export function templateCopy(
  rules: PresentRules,
  id: string,
  init: { id: string; name?: string },
  seed: string,
): CharacterState | undefined {
  const found = rules.bestiary?.(id)
  const sheetId = found && rules.templateSheet?.(found.bestiary, id)
  const sheet = sheetId ? rules.sheets?.[sheetId] : undefined
  if (!found || !sheetId || !sheet) return undefined
  return copyOf(
    sheet,
    sheetId,
    found.template,
    { ...init, from: found.bestiary },
    { roller: momentRoller(seed), items: rules.items },
  )
}

const left = (
  p: Present,
  because: Extract<PresentEvent, { type: 'PRESENT_LEFT' }>['because'],
  condition?: string,
  conditionName?: string,
): PresentEvent => ({
  type: 'PRESENT_LEFT',
  id: p.character.id,
  ...(p.character.name !== undefined && { name: p.character.name }),
  ...(p.character.template && { template: p.character.template.id }),
  because,
  ...(condition !== undefined && { condition }),
  ...(conditionName !== undefined && { conditionName }),
})

/**
 * Brings a character to the party's place as one of those present (in place): one taken from
 * the roster, made from a template or by hand. A copy of the trip's own with its id makes
 * room (its id numbered), so the one brought keeps its id and its link. It stays when left
 * behind, as the system's default.
 */
export function addPresent(s: PresentTarget, character: CharacterState): PresentEvent[] {
  const used = new Set([
    ...(s.party ? [s.party.id] : []),
    ...(s.members ?? []).map((m) => m.id),
    ...(s.present ?? []).map((p) => p.character.id),
  ])
  if (used.has(character.id)) {
    const free = newId(character.id, used)
    s.present = (s.present ?? []).map((p) =>
      p.character.id === character.id ? { ...p, character: { ...p.character, id: free } } : p,
    )
  }
  s.present = [...(s.present ?? []), { character, at: s.travel.location ?? '' }]
  return [
    {
      type: 'PRESENT_CAME',
      template: character.template?.id ?? character.id,
      ids: [character.id],
      names: [character.name ?? character.id],
    },
  ]
}

/** Takes one copy off by hand (in place), with its line. */
export function removePresent(s: PresentTarget, id: string): PresentEvent[] {
  const p = (s.present ?? []).find((c) => c.character.id === id)
  if (!p) return []
  s.present = (s.present ?? []).filter((c) => c !== p)
  return [left(p, 'hand')]
}

/**
 * Moves one copy to another place by hand (in place: a token dragged on the map), with
 * its line; nothing when it's already there. Put away from the party, it stays there
 * (`behind: leave` is for the party leaving it, not the player placing it).
 */
export function movePresent(s: PresentTarget, id: string, at: string): PresentEvent[] {
  const p = (s.present ?? []).find((c) => c.character.id === id)
  if (!p || p.at === at) return []
  const moved: Present = { ...p, at }
  if (at !== s.travel.location) delete moved.behind
  s.present = (s.present ?? []).map((c) => (c === p ? moved : c))
  return [{ type: 'PRESENT_MOVED', id, name: p.character.name ?? id, at }]
}

/**
 * Settles those present (in place): what holds by itself on each copy here, in `world`;
 * then takes off the copies with a condition that `leaves` and those left behind that go
 * (`behind: leave`). What changed on them, and who left.
 */
export function settlePresent(
  s: PresentTarget,
  rules: PresentRules,
  world: Record<string, unknown> = {},
  time?: number,
): { events: CharacterEvent[]; present: PresentEvent[] } {
  const events: CharacterEvent[] = []
  const present: PresentEvent[] = []
  if (!s.present?.length) return { events, present }
  const options = { world, ...(time !== undefined && { time }) }
  const kept: Present[] = []
  for (const p of s.present) {
    if (p.at !== s.travel.location) {
      if (p.behind === 'leave') present.push(left(p, 'behind'))
      else kept.push(p)
      continue
    }
    const sheet = copySheet(rules)(p.character)
    if (!sheet) {
      kept.push(p)
      continue
    }
    const done = settleCharacter(sheet, p.character, options)
    events.push(...done.events)
    const leaving = Object.keys(done.state.conditions).find((c) => sheet.conditions[c]?.leaves)
    const next = done.events.length ? { ...p, character: done.state } : p
    if (leaving)
      present.push(
        left(next, 'condition', leaving, textOf(sheet.conditions[leaving].name, rules.locale)),
      )
    else kept.push(next)
  }
  s.present = kept
  return { events, present }
}

/**
 * What conditions and tables read of those present: `present.ids`, `present.count`,
 * `present.tags` (every tag of those here) and each template's `present.<id>.count` and
 * `.ids` (every template of the system, at 0 when none is here); and each copy here as a
 * character (`characters.<id>.*`), beside the members.
 */
export function presentFacts(
  s: Pick<PresentTarget, 'present' | 'travel'>,
  rules: PresentRules,
): { present: Record<string, unknown>; characters: Record<string, Record<string, unknown>> } {
  const here = presentHere(s)
  const byTemplate: Record<string, { count: number; ids: string[] }> = Object.fromEntries(
    (rules.templateIds ?? []).map((id) => [id, { count: 0, ids: [] }]),
  )
  const tags = new Set<string>()
  for (const p of here) {
    p.character.tags.forEach((t) => tags.add(t))
    const id = p.character.template?.id
    if (id === undefined) continue
    const t = (byTemplate[id] ??= { count: 0, ids: [] })
    t.count++
    t.ids.push(p.character.id)
  }
  return {
    present: {
      ...byTemplate,
      ids: here.map((p) => p.character.id),
      count: here.length,
      tags: [...tags],
    },
    characters: Object.fromEntries(
      here.map((p) => [p.character.id, characterFacts(p.character, copySheet(rules)(p.character))]),
    ),
  }
}
