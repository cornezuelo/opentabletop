/**
 * Items: the things a character has, each with how many (`count`), where it is (a place
 * the sheet declares, one of its own, or inside another item) and the fields the sheet
 * declares for items in its system (slots, weight, uses…). Items come from a system's
 * catalogues (`kind: items`) or are written by hand; an item taken from a catalogue keeps
 * a copy of what it had there, so a character reads the same whatever packs are loaded.
 *
 * Nothing here names a game: what fields an item has, where it may go, what fills a
 * place's room and what happens when a field runs out are all the sheet's.
 */
import { changeValue, evaluate, lookupIn, type Bounds } from '@open-tabletop/variables'
import { matches, validateCondition, type Condition } from '@open-tabletop/conditions'
import { z } from 'zod'

const text = z.union([z.string(), z.record(z.string(), z.string())])
const condition = z.custom<Condition>(
  (v) => typeof v === 'object' && v !== null && !Array.isArray(v),
  { message: 'a condition' },
)

/** What an item may hold, when it's a container (a backpack, saddlebags, a quiver). */
const holds = z
  .object({
    /** How much fits inside, measured as the sheet's places are (`items.size`). */
    room: z.number().optional(),
    /** What it is as a place: an item `fits` it by these (`place.tags: pack`). */
    tags: z.array(z.string().min(1)).optional(),
  })
  .strict()

/** The keys an item has besides its fields; a sheet can't name a field like them. */
export const ITEM_KEYS = [
  'name',
  'description',
  'tags',
  'fits',
  'holds',
  'count',
  'place',
  'id',
  'key',
  'from',
  'start',
  'fields',
] as const

/** A catalogue's item: its texts, tags, where it fits, what it holds, and its fields' numbers. */
const catalogueItem = z
  .object({
    name: text.optional(),
    description: text.optional(),
    tags: z.array(z.string().min(1)).optional(),
    /** The places it may go: a condition on the place (`place.tags: head`); absent: any. */
    fits: condition.optional(),
    holds: holds.optional(),
  })
  .catchall(z.number())

export const catalogueSchema = z
  .object({
    kind: z.literal('items'),
    id: z.string().min(1),
    name: text.optional(),
    description: text.optional(),
    items: z.record(z.string().min(1), catalogueItem).default({}),
  })
  .strict()

export type Catalogue = z.infer<typeof catalogueSchema>
export type CatalogueItem = z.infer<typeof catalogueItem>

/** Reads a `kind: items` definition: the catalogue, or the problems found (`path: message`). */
export function parseCatalogue(raw: unknown): { catalogue?: Catalogue; errors: string[] } {
  const parsed = catalogueSchema.safeParse(raw)
  if (!parsed.success)
    return {
      errors: parsed.error.issues.map((i) => `${i.path.join('.') || 'items'}: ${i.message}`),
    }
  const errors: string[] = []
  for (const [id, item] of Object.entries(parsed.data.items)) {
    if (id === 'tags')
      errors.push(`items.tags: "tags" can't be an item's id (it reads every item's tags)`)
    if (id.includes('.')) errors.push(`items.${id}: an id without dots`)
    if (item.fits !== undefined) errors.push(...validateCondition(item.fits, `items.${id}.fits`))
  }
  return errors.length ? { errors } : { catalogue: parsed.data, errors }
}

/** One item a character has. */
export interface ItemState {
  /** Unique on the character: the item's id, or `<id>-2`, `<id>-3`… for more of them apart. */
  key: string
  /** Its id: the catalogue's (`torch`), or its own when written by hand. */
  id: string
  /** The catalogue it comes from (`pack/id`); absent: written by hand. */
  from?: string
  /** Its name, when written by hand or renamed (a catalogue's comes from the catalogue). */
  name?: string
  count: number
  /** A place of the sheet, one of the character's own, or another item's `key` (inside it). */
  place?: string
  tags?: string[]
  /** Its fields' numbers (those of the sheet's fields). */
  fields: Record<string, number>
  /** What its fields that run out (`spent`) start again at, for the next one. */
  start?: Record<string, number>
  fits?: Condition
  holds?: z.infer<typeof holds>
}

/** A place a character has of its own, besides the sheet's (an odd creature's third arm). */
export interface OwnPlace {
  name?: string
  tags?: string[]
  room?: number
}

/** A field items have in a system, as the sheet declares it. */
export interface ItemField {
  name?: unknown
  description?: unknown
  default?: number
  min?: number | string
  max?: number | string
  /** Reaching its min uses one up: the count goes down and the next starts again. */
  spent?: boolean
}

/** A place of the sheet. */
export interface SheetPlace {
  name?: unknown
  description?: unknown
  tags?: string[]
  room?: number | string
}

/** What the sheet says of items: their fields, places and what fills a place's room. */
export interface SheetItems {
  fields?: Record<string, ItemField>
  places?: Record<string, SheetPlace>
  /** The field that says how much room an item takes (× its count); absent: one each. */
  size?: string
}

/** A text of the character's own values as it reads now (a bound, a room), if a number. */
function readOwn(written: number | string | undefined, values: Record<string, number>) {
  if (typeof written === 'number') return written
  if (written === undefined) return undefined
  const n = evaluate(written, lookupIn({ self: { values } }))
  return typeof n === 'number' && Number.isFinite(n) ? n : undefined
}

/** The bounds of an item's field now. */
export function fieldBounds(
  items: SheetItems | undefined,
  field: string,
  values: Record<string, number>,
): Bounds {
  const def = items?.fields?.[field]
  const min = readOwn(def?.min, values)
  const max = readOwn(def?.max, values)
  return { ...(min !== undefined && { min }), ...(max !== undefined && { max }) }
}

/** A place an item may be in: the sheet's, the character's own, or a container's. */
export interface Place {
  id: string
  name?: unknown
  tags: string[]
  room?: number
  /** The container's key, when the place is an item. */
  item?: string
}

/** Every place a character's items may be in, the sheet's first, then its own, then containers. */
export function placesOf(
  items: SheetItems | undefined,
  state: { values: Record<string, number>; items?: ItemState[]; places?: Record<string, OwnPlace> },
): Place[] {
  const out: Place[] = []
  for (const [id, p] of Object.entries(items?.places ?? {})) {
    const room = readOwn(p.room, state.values)
    out.push({ id, name: p.name, tags: p.tags ?? [], ...(room !== undefined && { room }) })
  }
  for (const [id, p] of Object.entries(state.places ?? {}))
    if (!out.some((o) => o.id === id))
      out.push({
        id,
        name: p.name,
        tags: p.tags ?? [],
        ...(p.room !== undefined && { room: p.room }),
      })
  for (const item of state.items ?? [])
    if (item.holds)
      out.push({
        id: item.key,
        name: item.name,
        tags: item.holds.tags ?? [],
        ...(item.holds.room !== undefined && { room: item.holds.room }),
        item: item.key,
      })
  return out
}

/** How much room an item takes: its `size` field × its count, or its count. */
export function sizeOf(items: SheetItems | undefined, item: ItemState): number {
  const size = items?.size
  return size === undefined ? item.count : (item.fields[size] ?? 0) * item.count
}

/** How much of each place is taken by the items right in it (a container counts once, not its contents). */
export function roomUsed(
  items: SheetItems | undefined,
  state: { items?: ItemState[] },
): Record<string, number> {
  const out: Record<string, number> = {}
  for (const item of state.items ?? [])
    if (item.place !== undefined) out[item.place] = (out[item.place] ?? 0) + sizeOf(items, item)
  return out
}

/** Whether an item fits a place (its `fits`, read with the place as `place.*`), and isn't itself or inside itself. */
export function fitsIn(
  item: Pick<ItemState, 'key' | 'fits'>,
  place: Place,
  all: ItemState[] = [],
): boolean {
  if (place.item !== undefined) {
    // Never inside itself, or inside something it holds.
    let at: string | undefined = place.item
    for (let depth = 0; at !== undefined && depth <= all.length; depth++) {
      if (at === item.key) return false
      at = all.find((i) => i.key === at)?.place
    }
  }
  return matches(item.fits, { place: { id: place.id, tags: place.tags } })
}

/** A new key for an item with this id: the id, or the id with the first number free. */
export function newKey(id: string, all: ItemState[]): string {
  if (!all.some((i) => i.key === id)) return id
  for (let n = 2; ; n++) if (!all.some((i) => i.key === `${id}-${n}`)) return `${id}-${n}`
}

/**
 * An item of a catalogue as a character has it: a copy of its tags, where it fits, what it
 * holds and the fields the sheet declares (each field's default where the catalogue says
 * nothing), `count` of it.
 */
export function itemFromCatalogue(
  items: SheetItems | undefined,
  catalogue: string,
  id: string,
  def: CatalogueItem,
  count = 1,
): Omit<ItemState, 'key'> {
  const fields: Record<string, number> = {}
  for (const [field, f] of Object.entries(items?.fields ?? {})) {
    const n = def[field]
    if (typeof n === 'number') fields[field] = n
    else if (f.default !== undefined) fields[field] = f.default
  }
  return {
    id,
    from: catalogue,
    count,
    ...(def.tags?.length && { tags: [...def.tags] }),
    fields,
    ...(def.fits && { fits: def.fits }),
    ...(def.holds && { holds: { ...def.holds } }),
  }
}

/** The fields of an item written by hand, each the sheet's default where it says nothing. */
export function withDefaults(
  items: SheetItems | undefined,
  fields: Record<string, number> = {},
): Record<string, number> {
  const out = { ...fields }
  for (const [field, f] of Object.entries(items?.fields ?? {}))
    if (out[field] === undefined && f.default !== undefined) out[field] = f.default
  return out
}

/** What fields that run out start again at: an item's own numbers for them now. */
export function startOf(
  items: SheetItems | undefined,
  fields: Record<string, number>,
): Record<string, number> | undefined {
  const spent = Object.entries(items?.fields ?? {}).filter(
    ([field, f]) => f.spent && fields[field] !== undefined,
  )
  return spent.length
    ? Object.fromEntries(spent.map(([field]) => [field, fields[field]]))
    : undefined
}

/**
 * The first place an item goes to when nothing says where: the first of the sheet's (then
 * the character's own) it fits with room left for it, else the first it fits; none when
 * the sheet has no places or it fits none.
 */
export function defaultPlace(
  items: SheetItems | undefined,
  state: { values: Record<string, number>; items?: ItemState[]; places?: Record<string, OwnPlace> },
  item: Omit<ItemState, 'key'> & { key?: string },
): string | undefined {
  const all = state.items ?? []
  const places = placesOf(items, state).filter((p) => p.item === undefined)
  const used = roomUsed(items, state)
  const fitting = places.filter((p) => fitsIn({ key: item.key ?? '', fits: item.fits }, p, all))
  const size = sizeOf(items, { ...item, key: item.key ?? '' })
  const roomy = fitting.find((p) => p.room === undefined || (used[p.id] ?? 0) + size <= p.room)
  return (roomy ?? fitting[0])?.id
}

/** The keys of the items inside an item, at any depth (its contents, theirs…). */
export function contentsOf(key: string, all: ItemState[]): string[] {
  const out: string[] = []
  const visit = (k: string) => {
    for (const i of all)
      if (i.place === k && !out.includes(i.key)) {
        out.push(i.key)
        visit(i.key)
      }
  }
  visit(key)
  return out
}

/**
 * What a condition reads of one item (for a value made of items, `where:`): `item.*` (its
 * id, key, count, tags, place, fields, `inside` when in a container, `within` the place
 * it's in at the top) and `place.*` (the place it's right in: its id and tags).
 */
export function itemFacts(item: ItemState, all: ItemState[], places: Place[]) {
  let within = item.place
  for (let depth = 0; depth <= all.length; depth++) {
    const holder = all.find((i) => i.key === within)
    if (!holder) break
    within = holder.place
  }
  const place = places.find((p) => p.id === item.place)
  return {
    item: {
      ...item.fields,
      id: item.id,
      key: item.key,
      count: item.count,
      tags: item.tags ?? [],
      ...(item.place !== undefined && { place: item.place }),
      ...(within !== undefined && { within }),
      inside: all.some((i) => i.key === item.place),
    },
    ...(place && { place: { id: place.id, tags: place.tags } }),
  }
}

/**
 * A value made of the items (`from: { sum: items.slots }`): the `sum` of a field (× each
 * one's count), the `max` or `min` of it, or how many there are (`count: items`, or the
 * field `items.count`), among the items its `where` lets in.
 */
export interface ItemsFrom {
  sum?: string
  max?: string
  min?: string
  count?: 'items'
  where?: Condition
}

/** Problems of a value made of items (empty: fine). */
export function itemsFromErrors(from: ItemsFrom, items: SheetItems | undefined, at: string) {
  const errors: string[] = []
  const ways = (['sum', 'max', 'min', 'count'] as const).filter((k) => from[k] !== undefined)
  if (ways.length !== 1)
    errors.push(`${at}: one of sum, max or min (items.<field>), or count: items`)
  for (const k of ['sum', 'max', 'min'] as const) {
    const written = from[k]
    if (written === undefined) continue
    const field = written.match(/^items\.(.+)$/)?.[1]
    if (field === undefined) errors.push(`${at}.${k}: items.<field> ('items.slots')`)
    else if (field !== 'count' && !items?.fields?.[field])
      errors.push(`${at}.${k}: no item field "${field}" on this sheet (items.fields)`)
  }
  if (from.count !== undefined && from.count !== 'items') errors.push(`${at}.count: items`)
  if (from.where !== undefined) errors.push(...validateCondition(from.where, `${at}.where`))
  return errors
}

/** The number a value made of items is now. */
export function itemsValue(
  from: ItemsFrom,
  all: ItemState[],
  places: Place[],
  self: Record<string, unknown>,
): number {
  const counted = all.filter(
    (i) => from.where === undefined || matches(from.where, { ...itemFacts(i, all, places), self }),
  )
  if (from.count !== undefined) return counted.reduce((n, i) => n + i.count, 0)
  const field = (from.sum ?? from.max ?? from.min ?? '').replace(/^items\./, '')
  const of = (i: ItemState) => (field === 'count' ? i.count : (i.fields[field] ?? 0))
  if (from.sum !== undefined)
    return counted.reduce((n, i) => n + (field === 'count' ? i.count : of(i) * i.count), 0)
  if (!counted.length) return 0
  const numbers = counted.map(of)
  return from.max !== undefined ? Math.max(...numbers) : Math.min(...numbers)
}

/**
 * What conditions and tables read of a character's items: `items.<id>` (`count` of all of
 * them, and the first one's tags, place and fields: `items.torch.uses`), `items.tags`
 * (every tag of every item), and `places.<id>` (its `room`, how much is `used`, its
 * `tags` and the `items` right in it, by id).
 */
export function itemsFacts(
  items: SheetItems | undefined,
  state: { values: Record<string, number>; items?: ItemState[]; places?: Record<string, OwnPlace> },
): { items: Record<string, unknown>; places: Record<string, unknown> } {
  const all = state.items ?? []
  const byId: Record<string, unknown> = {}
  const tags = new Set<string>()
  for (const item of all) {
    item.tags?.forEach((t) => tags.add(t))
    const seen = byId[item.id] as { count: number } | undefined
    if (seen) seen.count += item.count
    else
      byId[item.id] = {
        ...item.fields,
        count: item.count,
        tags: item.tags ?? [],
        ...(item.place !== undefined && { place: item.place }),
      }
  }
  const used = roomUsed(items, state)
  const places = Object.fromEntries(
    placesOf(items, state).map((p) => [
      p.id,
      {
        ...(p.room !== undefined && { room: p.room }),
        used: used[p.id] ?? 0,
        tags: p.tags,
        items: [...new Set(all.filter((i) => i.place === p.id).map((i) => i.id))],
      },
    ]),
  )
  return { items: { ...byId, tags: [...tags] }, places }
}

/** What happened to a character's items. */
export type ItemEvent =
  | { type: 'ITEM_ADDED'; character: string; item: string; key: string; count: number }
  | { type: 'ITEM_REMOVED'; character: string; item: string; key: string; count: number }
  | {
      type: 'ITEM_CHANGED'
      character: string
      item: string
      key: string
      /** `count`, or one of its fields. */
      field: string
      from: number
      to: number
    }
  | { type: 'ITEM_MOVED'; character: string; item: string; key: string; from?: string; to?: string }
  /** One of an item was used up: a field that runs out reached its min. */
  | { type: 'ITEM_SPENT'; character: string; item: string; key: string; field: string }
  /** It can't go there: its `fits` says no, or it would be inside itself. */
  | { type: 'ITEM_DOESNT_FIT'; character: string; item: string; key: string; place: string }
  /** An effect gave an item no catalogue of the system has (and the character has none of). */
  | { type: 'UNKNOWN_ITEM'; character: string; item: string }

/** Finds an item of a system's catalogues by id: the catalogue's full id and the item. */
export type ItemLookup = (id: string) => { catalogue: string; item: CatalogueItem } | undefined

/** The items of these catalogues by id, the first catalogue's first where two share one. */
export function lookupItems(catalogues: { id: string; def: Catalogue }[]): ItemLookup {
  return (id) => {
    for (const c of catalogues) {
      const item = c.def.items[id]
      if (item) return { catalogue: c.id, item }
    }
    return undefined
  }
}

type Mutable = {
  id: string
  values: Record<string, number>
  items?: ItemState[]
  places?: Record<string, OwnPlace>
}

/** Takes an item out (in place), with everything inside it. */
export function removeItem(
  state: Mutable,
  key: string,
  events: { push(e: ItemEvent): unknown },
): void {
  const all = state.items ?? []
  const gone = [key, ...contentsOf(key, all)]
  for (const k of gone) {
    const item = all.find((i) => i.key === k)
    if (item)
      events.push({
        type: 'ITEM_REMOVED',
        character: state.id,
        item: item.id,
        key: item.key,
        count: item.count,
      })
  }
  state.items = all.filter((i) => !gone.includes(i.key))
}

/** Adds an item (in place), to its place or the first it fits; stacked onto a like one there. */
export function addItem(
  items: SheetItems | undefined,
  state: Mutable,
  input: Omit<ItemState, 'key' | 'fields'> & { fields?: Record<string, number> },
  events: { push(e: ItemEvent): unknown },
): ItemState | undefined {
  const all = (state.items ??= [])
  const fields = withDefaults(items, input.fields)
  const draft = { ...input, fields }
  const place = input.place ?? defaultPlace(items, state, draft)
  if (place !== undefined) {
    const where = placesOf(items, state).find((p) => p.id === place)
    if (where && !fitsIn({ key: '', fits: input.fits }, where, all)) {
      events.push({ type: 'ITEM_DOESNT_FIT', character: state.id, item: input.id, key: '', place })
      return undefined
    }
  }
  if (input.count <= 0) return undefined
  // The same item in the same place, alike in everything: one more of it.
  const like = all.find(
    (i) =>
      i.id === input.id &&
      i.from === input.from &&
      i.place === place &&
      i.name === input.name &&
      !i.holds &&
      !input.holds &&
      JSON.stringify(i.fields) === JSON.stringify(fields),
  )
  if (like) {
    const from = like.count
    like.count += input.count
    events.push({
      type: 'ITEM_CHANGED',
      character: state.id,
      item: like.id,
      key: like.key,
      field: 'count',
      from,
      to: like.count,
    })
    return like
  }
  const start = input.start ?? startOf(items, fields)
  const made: ItemState = {
    key: newKey(input.id, all),
    id: input.id,
    ...(input.from !== undefined && { from: input.from }),
    ...(input.name !== undefined && { name: input.name }),
    count: input.count,
    ...(place !== undefined && { place }),
    ...(input.tags?.length && { tags: [...input.tags] }),
    fields,
    ...(start && { start }),
    ...(input.fits && { fits: input.fits }),
    ...(input.holds && { holds: { ...input.holds } }),
  }
  all.push(made)
  events.push({
    type: 'ITEM_ADDED',
    character: state.id,
    item: made.id,
    key: made.key,
    count: made.count,
  })
  return made
}

/** Moves an item (in place) to a place, or out of every place; refused where it doesn't fit. */
export function moveItem(
  items: SheetItems | undefined,
  state: Mutable,
  key: string,
  place: string | undefined,
  events: { push(e: ItemEvent): unknown },
): void {
  const all = state.items ?? []
  const item = all.find((i) => i.key === key)
  if (!item || item.place === place) return
  if (place !== undefined) {
    const where = placesOf(items, state).find((p) => p.id === place)
    if (!where || !fitsIn(item, where, all)) {
      events.push({ type: 'ITEM_DOESNT_FIT', character: state.id, item: item.id, key, place })
      return
    }
  }
  const from = item.place
  if (place === undefined) delete item.place
  else item.place = place
  events.push({
    type: 'ITEM_MOVED',
    character: state.id,
    item: item.id,
    key,
    ...(from !== undefined && { from }),
    ...(place !== undefined && { to: place }),
  })
}

/**
 * Changes an item's count or one of its fields (in place), in the effects' syntax already
 * read (a number adds, `'=N'` sets). A count at 0 takes it out; a field that runs out
 * (`spent`) reaching its min uses one up, and the next starts again.
 */
export function changeItem(
  items: SheetItems | undefined,
  state: Mutable,
  key: string,
  field: string,
  change: number | string,
  events: { push(e: ItemEvent): unknown },
): void {
  const item = state.items?.find((i) => i.key === key)
  if (!item) return
  const who = state.id
  if (field === 'count') {
    const { to } = changeValue(item.count, change, { min: 0 })
    if (to === item.count) return
    if (to <= 0) return removeItem(state, key, events)
    events.push({
      type: 'ITEM_CHANGED',
      character: who,
      item: item.id,
      key,
      field,
      from: item.count,
      to,
    })
    item.count = to
    return
  }
  const bounds = fieldBounds(items, field, state.values)
  const from = item.fields[field] ?? 0
  const { to } = changeValue(from, change, bounds)
  if (to !== from) {
    item.fields[field] = to
    events.push({ type: 'ITEM_CHANGED', character: who, item: item.id, key, field, from, to })
  }
  const def = items?.fields?.[field]
  if (def?.spent && bounds.min !== undefined && to <= bounds.min && from > bounds.min) {
    events.push({ type: 'ITEM_SPENT', character: who, item: item.id, key, field })
    if (item.count <= 1) return removeItem(state, key, events)
    item.count -= 1
    item.fields[field] = item.start?.[field] ?? def.default ?? bounds.max ?? from
  }
}

/**
 * An effect on items (in place): `items.<id>` changes how many there are (more of the first
 * one, or from the catalogue when there's none; fewer from the last ones first),
 * `items.<id>.<field>` the first one's field. `change` is already read.
 */
export function itemEffect(
  items: SheetItems | undefined,
  state: Mutable,
  path: string,
  change: number | string,
  lookup: ItemLookup | undefined,
  events: { push(e: ItemEvent): unknown },
): void {
  const [id, field] = path.split('.', 2)
  const all = (state.items ??= [])
  const mine = all.filter((i) => i.id === id)
  // A field of one it doesn't have: nothing to change (a torch's uses, with no torch).
  if (field !== undefined) {
    if (mine[0]) changeItem(items, state, mine[0].key, field, change, events)
    return
  }
  const have = mine.reduce((n, i) => n + i.count, 0)
  const wanted = changeValue(have, change, { min: 0 }).to
  let delta = wanted - have
  if (delta > 0) {
    if (mine[0]) return changeItem(items, state, mine[0].key, 'count', delta, events)
    const found = lookup?.(id)
    if (!found) return void events.push({ type: 'UNKNOWN_ITEM', character: state.id, item: id })
    addItem(items, state, itemFromCatalogue(items, found.catalogue, id, found.item, delta), events)
    return
  }
  for (const item of [...mine].reverse()) {
    if (delta >= 0) break
    const taken = Math.min(item.count, -delta)
    changeItem(items, state, item.key, 'count', -taken, events)
    delta += taken
  }
}

/** Problems of what a sheet says of items (empty: fine). */
export function sheetItemsErrors(
  items: SheetItems,
  ownErrors: (written: string, at: string) => string[],
): string[] {
  const errors: string[] = []
  for (const [id, f] of Object.entries(items.fields ?? {})) {
    if ((ITEM_KEYS as readonly string[]).includes(id))
      errors.push(`items.fields.${id}: "${id}" is a key every item has; name the field otherwise`)
    if (id.includes('.')) errors.push(`items.fields.${id}: an id without dots`)
    for (const key of ['min', 'max'] as const)
      if (typeof f[key] === 'string') errors.push(...ownErrors(f[key], `items.fields.${id}.${key}`))
    if (f.spent && f.min === undefined)
      errors.push(`items.fields.${id}.spent: needs a min to run out at`)
  }
  for (const [id, p] of Object.entries(items.places ?? {}))
    if (typeof p.room === 'string') errors.push(...ownErrors(p.room, `items.places.${id}.room`))
  if (items.size !== undefined && !items.fields?.[items.size])
    errors.push(`items.size: no item field "${items.size}" (items.fields)`)
  return errors
}
