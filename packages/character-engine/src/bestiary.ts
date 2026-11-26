/**
 * The bestiary: templates of characters (creatures, NPC types) a system offers, each a
 * character of a sheet, written as its state is, with rolls filled in for each copy
 * (`health: '{{2d4}}'`). A copy is taken once, as an item from a catalogue is: later
 * changes to the template don't touch copies already made (docs/bestiary.md).
 *
 * Nothing here names a game: which sheet, which values, how many come and what becomes
 * of those left behind are the pack's.
 */
import { validateCondition, type Condition } from '@open-tabletop/conditions'
import { z } from 'zod'

const text = z.union([z.string(), z.record(z.string(), z.string())])
/** A number, or a text with variables and rolls (`'{{2d4}}'`), read for each copy. */
const written = z.union([z.number(), z.string().min(1)])

/** What becomes of copies the party leaves behind: they `stay` there, or `leave`. */
export const BEHIND = ['stay', 'leave'] as const
export type Behind = (typeof BEHIND)[number]

/**
 * Whether copies go along with the party as it leaves their place (a chase): `true` always,
 * or a condition read with the copy acting (`acting.conditions: hostile`) and the trip as it
 * is on reaching the next place; those that don't follow are left behind (`behind`).
 */
const follows = z.union([
  z.boolean(),
  z.custom<Condition>((v) => typeof v === 'object' && v !== null && !Array.isArray(v), {
    message: 'true, false or a condition',
  }),
])
export type Follows = z.infer<typeof follows>

/**
 * Whose side copies are on in a fight: the `foes` met (the default), or the `party`'s, as
 * its allies (a hound, a summoned creature, a hired sword): they go along with it, fight
 * beside it and act by themselves on their turns.
 */
export const SIDES = ['foes', 'party'] as const
export type TemplateSide = (typeof SIDES)[number]

/**
 * The token kinds a template may be drawn as on a map: the map's own kinds of token (how
 * it's drawn: its default colours and icon), not a game's, so not a system's to declare.
 */
export const TEMPLATE_TOKEN_KINDS = ['pc', 'npc', 'enemy'] as const

const template = z
  .object({
    name: text.optional(),
    description: text.optional(),
    /** Its sheet (`sheet.beast`); absent: the catalogue's. */
    sheet: z.string().min(1).optional(),
    /** Another template of the same catalogue this one is a variant of. */
    like: z.string().min(1).optional(),
    /** A table or generator rolled for each copy's name; absent: the template's, numbered. */
    names: z.string().min(1).optional(),
    /**
     * What a copy does on its turn in a fight (`table.wolf-turn`): a table (or anything the
     * Oracle rolls) its system rolls for it, acting as that copy; absent: the system's.
     */
    actions: z.string().min(1).optional(),
    tags: z.array(z.string().min(1)).optional(),
    conditions: z.array(z.string().min(1)).optional(),
    values: z.record(z.string().min(1), written).optional(),
    /** What it carries, from the system's catalogues: `{ knife: 1, ration: '{{1d2}}' }`. */
    items: z.record(z.string().min(1), written).optional(),
    /** How it's drawn on a map, all optional. */
    token: z
      .object({
        icon: z.string().min(1).optional(),
        kind: z.enum(TEMPLATE_TOKEN_KINDS).optional(),
        color: z.string().min(1).optional(),
      })
      .strict()
      .optional(),
    behind: z.enum(BEHIND).optional(),
    follows: follows.optional(),
    /**
     * Whether its copies fight (absent: they do). `false`: a thing present that doesn't (a
     * chest, a trap), aimed at by actions, left out of a fight's sides and of
     * `present.fighters`.
     */
    fights: z.boolean().optional(),
    /** Whose side its copies are on (absent: the bestiary's, else `foes`). */
    side: z.enum(SIDES).optional(),
  })
  .strict()

export const bestiarySchema = z
  .object({
    kind: z.literal('bestiary'),
    id: z.string().min(1),
    name: text.optional(),
    description: text.optional(),
    /** Every template's sheet, unless one names its own. */
    sheet: z.string().min(1).optional(),
    /** What becomes of copies left behind, unless a template says otherwise; absent: `stay`. */
    behind: z.enum(BEHIND).optional(),
    /** Whether copies follow the party, unless a template says otherwise; absent: they don't. */
    follows: follows.optional(),
    /** Whose side copies are on, unless a template says otherwise; absent: `foes`. */
    side: z.enum(SIDES).optional(),
    templates: z.record(z.string().min(1), template).default({}),
  })
  .strict()

export type Bestiary = z.infer<typeof bestiarySchema>
export type TemplateDef = z.infer<typeof template>

/**
 * Ids a template can't have: they read every copy (`present.all`, `present.count`,
 * `present.tags`, `present.ids`) or those that fight (`present.fighters`).
 */
export const RESERVED_TEMPLATE_IDS = ['all', 'count', 'tags', 'ids', 'fighters'] as const

/** Reads a `kind: bestiary` definition: the catalogue, or the problems found (`path: message`). */
export function parseBestiary(raw: unknown): { bestiary?: Bestiary; errors: string[] } {
  const parsed = bestiarySchema.safeParse(raw)
  if (!parsed.success)
    return {
      errors: parsed.error.issues.map((i) => `${i.path.join('.') || 'bestiary'}: ${i.message}`),
    }
  const def = parsed.data
  const errors: string[] = []
  if (isCondition(def.follows)) errors.push(...validateCondition(def.follows, 'follows'))
  for (const [id, t] of Object.entries(def.templates)) {
    const at = `templates.${id}`
    if (isCondition(t.follows)) errors.push(...validateCondition(t.follows, `${at}.follows`))
    if ((RESERVED_TEMPLATE_IDS as readonly string[]).includes(id))
      errors.push(`${at}: "${id}" can't be a template's id (present.${id} reads every copy)`)
    if (id.includes('.')) errors.push(`${at}: an id without dots`)
    if (t.like !== undefined && !def.templates[t.like])
      errors.push(`${at}.like: no template "${t.like}" in this bestiary`)
  }
  for (const id of Object.keys(def.templates)) {
    const loop = likeChain(def, id).loop
    if (loop) errors.push(`templates.${id}.like: a variant of itself (${loop.join(' → ')})`)
  }
  for (const id of Object.keys(def.templates))
    if (resolveTemplate(def, id) && !resolveTemplate(def, id)!.sheet)
      errors.push(`templates.${id}.sheet: no sheet (the template's or the bestiary's sheet:)`)
  return errors.length ? { errors } : { bestiary: def, errors }
}

const isCondition = (f: Follows | undefined): f is Condition => typeof f === 'object' && f !== null

/** A template and those it's a variant of, itself first; `loop` when they go round. */
function likeChain(def: Bestiary, id: string): { chain: TemplateDef[]; loop?: string[] } {
  const seen: string[] = []
  const chain: TemplateDef[] = []
  for (let at: string | undefined = id; at !== undefined; at = def.templates[at]?.like) {
    if (seen.includes(at)) return { chain, loop: [...seen, at] }
    const t: TemplateDef | undefined = def.templates[at]
    if (!t) break
    seen.push(at)
    chain.push(t)
  }
  return { chain }
}

/** A template with what it takes from those it's a variant of, as a copy is made of it. */
export interface Template {
  id: string
  name?: TemplateDef['name']
  description?: TemplateDef['description']
  /** Its sheet as written (`sheet.beast`), for the system to find. */
  sheet?: string
  names?: string
  /** What a copy does on its turn in a fight (`table.wolf-turn`), as written. */
  actions?: string
  tags: string[]
  conditions: string[]
  values: Record<string, number | string>
  /** Absent: the sheet's `items.start`. */
  items?: Record<string, number | string>
  token?: TemplateDef['token']
  behind: Behind
  /** Whether its copies follow the party (`true`, or a condition); absent: they don't. */
  follows?: Condition | true
  /** Whether its copies fight. */
  fights: boolean
  /** Whose side its copies are on: the party's allies, or the foes met. */
  side: TemplateSide
}

/**
 * A template of the bestiary as a copy is made of it: a variant takes what it doesn't say
 * from the one it's `like` (its values and items merged, its tags and conditions
 * added); the bestiary gives the sheet, `behind`, `follows` and `side` none of them says.
 * Allies (`side: party`) follow the party unless one of them says otherwise.
 */
export function resolveTemplate(def: Bestiary, id: string): Template | undefined {
  const { chain, loop } = likeChain(def, id)
  if (!chain.length || loop) return undefined
  const out: Template = {
    id,
    tags: [],
    conditions: [],
    values: {},
    behind: 'stay',
    fights: true,
    side: 'foes',
  }
  // The furthest first, so each variant writes over what it's like.
  for (const t of [...chain].reverse()) {
    for (const key of ['name', 'description', 'sheet', 'names', 'actions', 'token'] as const)
      if (t[key] !== undefined) (out as unknown as Record<string, unknown>)[key] = t[key]
    for (const key of ['tags', 'conditions'] as const)
      for (const v of t[key] ?? []) if (!out[key].includes(v)) out[key].push(v)
    Object.assign(out.values, t.values)
    if (t.items) out.items = { ...out.items, ...t.items }
    if (t.behind) out.behind = t.behind
    if (t.follows !== undefined) setFollows(out, t.follows)
    if (t.fights !== undefined) out.fights = t.fights
    if (t.side) out.side = t.side
  }
  out.sheet ??= def.sheet
  if (!chain.some((t) => t.behind) && def.behind) out.behind = def.behind
  if (!chain.some((t) => t.follows !== undefined) && def.follows !== undefined)
    setFollows(out, def.follows)
  if (!chain.some((t) => t.side) && def.side) out.side = def.side
  // Allies go along with the party unless they say they don't.
  if (
    out.side === 'party' &&
    !chain.some((t) => t.follows !== undefined) &&
    def.follows === undefined
  )
    out.follows = true
  return out
}

/** A template's `follows` as written: `false` says they don't (none kept). */
function setFollows(out: Template, f: Follows): void {
  if (f === false) delete out.follows
  else out.follows = f === true ? true : (f as Condition)
}

/** Finds a template of a system's bestiaries by id: the bestiary's full id and the template. */
export type TemplateLookup = (id: string) => { bestiary: string; template: Template } | undefined

/** The templates of these bestiaries by id, the first bestiary's first where two share one. */
export function lookupTemplates(bestiaries: { id: string; def: Bestiary }[]): TemplateLookup {
  return (id) => {
    for (const b of bestiaries) {
      const template = b.def.templates[id] ? resolveTemplate(b.def, id) : undefined
      if (template) return { bestiary: b.id, template }
    }
    return undefined
  }
}
