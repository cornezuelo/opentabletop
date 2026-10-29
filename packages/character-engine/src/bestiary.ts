/**
 * The bestiary: templates of characters (creatures, NPC types) a system offers, each a
 * character of a sheet, written as its state is, with rolls filled in for each copy
 * (`health: '{{2d4}}'`). A copy is taken once, as an item from a catalogue is: later
 * changes to the template don't touch copies already made (docs/bestiary.md).
 *
 * Nothing here names a game: which sheet, which values, how many come and what becomes
 * of those left behind are the pack's.
 */
import { z } from 'zod'

const text = z.union([z.string(), z.record(z.string(), z.string())])
/** A number, or a text with variables and rolls (`'{{2d4}}'`), read for each copy. */
const written = z.union([z.number(), z.string().min(1)])

/** What becomes of copies the party leaves behind: they `stay` there, or `leave`. */
export const BEHIND = ['stay', 'leave'] as const
export type Behind = (typeof BEHIND)[number]

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
    tags: z.array(z.string().min(1)).optional(),
    conditions: z.array(z.string().min(1)).optional(),
    cards: z.array(z.string().min(1)).optional(),
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
    templates: z.record(z.string().min(1), template).default({}),
  })
  .strict()

export type Bestiary = z.infer<typeof bestiarySchema>
export type TemplateDef = z.infer<typeof template>

/** Ids a template can't have: they read every copy (`present.all`, `present.count`, `present.tags`, `present.ids`). */
export const RESERVED_TEMPLATE_IDS = ['all', 'count', 'tags', 'ids'] as const

/** Reads a `kind: bestiary` definition: the catalogue, or the problems found (`path: message`). */
export function parseBestiary(raw: unknown): { bestiary?: Bestiary; errors: string[] } {
  const parsed = bestiarySchema.safeParse(raw)
  if (!parsed.success)
    return {
      errors: parsed.error.issues.map((i) => `${i.path.join('.') || 'bestiary'}: ${i.message}`),
    }
  const def = parsed.data
  const errors: string[] = []
  for (const [id, t] of Object.entries(def.templates)) {
    const at = `templates.${id}`
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
  tags: string[]
  conditions: string[]
  cards: string[]
  values: Record<string, number | string>
  /** Absent: the sheet's `items.start`. */
  items?: Record<string, number | string>
  token?: TemplateDef['token']
  behind: Behind
}

/**
 * A template of the bestiary as a copy is made of it: a variant takes what it doesn't say
 * from the one it's `like` (its values and items merged, its tags, conditions and cards
 * added); the bestiary gives the sheet and `behind` none of them says.
 */
export function resolveTemplate(def: Bestiary, id: string): Template | undefined {
  const { chain, loop } = likeChain(def, id)
  if (!chain.length || loop) return undefined
  const out: Template = { id, tags: [], conditions: [], cards: [], values: {}, behind: 'stay' }
  // The furthest first, so each variant writes over what it's like.
  for (const t of [...chain].reverse()) {
    for (const key of ['name', 'description', 'sheet', 'names', 'token'] as const)
      if (t[key] !== undefined) (out as unknown as Record<string, unknown>)[key] = t[key]
    for (const key of ['tags', 'conditions', 'cards'] as const)
      for (const v of t[key] ?? []) if (!out[key].includes(v)) out[key].push(v)
    Object.assign(out.values, t.values)
    if (t.items) out.items = { ...out.items, ...t.items }
    if (t.behind) out.behind = t.behind
  }
  out.sheet ??= def.sheet
  if (!chain.some((t) => t.behind) && def.behind) out.behind = def.behind
  return out
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
