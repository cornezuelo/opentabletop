import { lookupIn, render, type Roller } from '@open-tabletop/variables'
import { localize, type LocalizedText } from './index'

/**
 * Places a result can make (docs/bestiary.md §3.4): a catalogue (`kind: places`) of
 * templates for points of interest, each made on the party's hex by an effect
 * `hex.pois.<template>: 1`, or by discovery's contents naming one. What a place is (its
 * name, icon, fields, the tags it gives the hex) is the pack's; the host writes it into its
 * map (the Hexmapper), or only notes it where it has none (Travel).
 */
export interface PlaceTemplate {
  name: LocalizedText
  /** Its text; `{{…}}` read from the result that makes it (`{{result}}`, its `set` values). */
  description?: LocalizedText
  /** An icon of the map's (`game:castle-ruins`). */
  icon?: string
  /** Tags the hex gets when the place is made there (`ruins`), as discovery's `set: { tags }`. */
  tags?: string[]
  /** Values tables and checks read, as a point of interest's fields; written values read too. */
  fields?: Record<string, string | number>
}

export interface PlacesCatalogue {
  kind: 'places'
  id: string
  name?: LocalizedText
  description?: LocalizedText
  places: Record<string, PlaceTemplate>
}

const PLACE_KEYS = ['name', 'description', 'icon', 'tags', 'fields']
const CATALOGUE_KEYS = ['kind', 'id', 'name', 'description', 'places']

const isText = (v: unknown): v is LocalizedText =>
  (typeof v === 'string' && v !== '') ||
  (typeof v === 'object' &&
    v !== null &&
    !Array.isArray(v) &&
    Object.values(v).every((x) => typeof x === 'string'))

/** Reads a `kind: places` definition: the catalogue, or the problems found (`path: message`). */
export function parsePlaces(raw: unknown): { places?: PlacesCatalogue; errors: string[] } {
  const errors: string[] = []
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw))
    return { errors: ['places: expected a definition'] }
  const r = raw as Record<string, unknown>
  if (r.kind !== 'places') errors.push('kind: expected "places"')
  if (typeof r.id !== 'string' || !r.id) errors.push('id: expected an id')
  for (const key of Object.keys(r))
    if (!CATALOGUE_KEYS.includes(key)) errors.push(`${key}: unknown key in a catalogue of places`)
  for (const key of ['name', 'description'])
    if (r[key] !== undefined && !isText(r[key])) errors.push(`${key}: expected a text`)
  const places: Record<string, PlaceTemplate> = {}
  const list = r.places ?? {}
  if (typeof list !== 'object' || list === null || Array.isArray(list))
    errors.push('places: expected places by id')
  else
    for (const [id, value] of Object.entries(list as Record<string, unknown>)) {
      const at = `places.${id}`
      if (id.includes('.')) errors.push(`${at}: an id without dots`)
      if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        errors.push(`${at}: expected a place (name, description, icon, tags, fields)`)
        continue
      }
      const p = value as Record<string, unknown>
      for (const key of Object.keys(p))
        if (!PLACE_KEYS.includes(key)) errors.push(`${at}.${key}: unknown key in a place`)
      if (!isText(p.name)) errors.push(`${at}.name: expected a text`)
      if (p.description !== undefined && !isText(p.description))
        errors.push(`${at}.description: expected a text`)
      if (p.icon !== undefined && (typeof p.icon !== 'string' || !p.icon))
        errors.push(`${at}.icon: expected an icon's id`)
      const tags = typeof p.tags === 'string' ? [p.tags] : Array.isArray(p.tags) ? p.tags : p.tags
      if (tags !== undefined && !(Array.isArray(tags) && tags.every((t) => typeof t === 'string')))
        errors.push(`${at}.tags: expected a list of tags`)
      const fields = p.fields
      if (
        fields !== undefined &&
        (typeof fields !== 'object' ||
          fields === null ||
          Array.isArray(fields) ||
          !Object.values(fields).every((v) => typeof v === 'string' || typeof v === 'number'))
      )
        errors.push(`${at}.fields: expected values by key (\`danger: 2\`)`)
      if (!isText(p.name)) continue
      places[id] = {
        name: p.name,
        ...(isText(p.description) && { description: p.description }),
        ...(typeof p.icon === 'string' && p.icon && { icon: p.icon }),
        ...(Array.isArray(tags) && tags.length && { tags: tags.map(String) }),
        ...(fields !== undefined &&
          Object.keys(fields as object).length && {
            fields: fields as Record<string, string | number>,
          }),
      }
    }
  if (errors.length) return { errors }
  return {
    places: {
      kind: 'places',
      id: r.id as string,
      ...(isText(r.name) && { name: r.name }),
      ...(isText(r.description) && { description: r.description }),
      places,
    },
    errors,
  }
}

/** The places of these catalogues by id, the first catalogue's first where two share one. */
export type PlaceLookup = (id: string) => { catalogue: string; place: PlaceTemplate } | undefined

export function lookupPlaces(catalogues: { id: string; def: PlacesCatalogue }[]): PlaceLookup {
  return (id) => {
    for (const c of catalogues)
      if (c.def.places[id]) return { catalogue: c.id, place: c.def.places[id] }
    return undefined
  }
}

/** A place as it was made: its texts in a language and filled, for the host to write. */
export interface MadePlace {
  /** Where it was made from: `<catalogue pack/id>/<place id>` (`grey-marches/default/ruin`). */
  template: string
  name: string
  description?: string
  icon?: string
  tags?: string[]
  fields?: { key: string; value: string }[]
}

/**
 * A path that makes places on the party's hex: `hex.pois.<template>`, its change how many
 * (a number, or a roll read as the effect's).
 */
export const PLACE_PATH = /^hex\.pois\.([^.]+)$/

/**
 * Makes one place from its template: texts in `locale` (the pack's base one as fallback),
 * `{{…}}` read from `context` (the result that makes it, the trip's facts) and rolled.
 */
export function makePlace(
  template: string,
  lookup: PlaceLookup | undefined,
  context: Record<string, unknown>,
  locale: string,
  /** Rolls `{{1d6}}` in its texts (none: a roll writes nothing). */
  roller?: Roller,
): MadePlace | undefined {
  const found = lookup?.(template)
  if (!found) return undefined
  const { place, catalogue } = found
  const read = lookupIn(context, roller)
  const text = (t: LocalizedText | undefined) => {
    const shown = localize(t, locale, 'en')
    return shown === undefined ? undefined : render(shown, read).trim()
  }
  const name = text(place.name) || template
  const description = text(place.description)
  const fields = Object.entries(place.fields ?? {}).map(([key, value]) => ({
    key,
    value: typeof value === 'number' ? String(value) : render(value, read),
  }))
  return {
    template: `${catalogue}/${template}`,
    name,
    ...(description && { description }),
    ...(place.icon && { icon: place.icon }),
    ...(place.tags?.length && { tags: [...place.tags] }),
    ...(fields.length && { fields }),
  }
}
