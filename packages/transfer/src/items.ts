import { parse as parseYaml } from 'yaml'
import { characterIdOf, isRecord, type Kept, type KeptPack } from './kept'

export type ItemKind = 'pack' | 'campaign' | 'map' | 'trip' | 'character'

/**
 * Why one thing needs another:
 * - `dependency`: a pack's dependency;
 * - `campaign`: the campaign a map or trip plays in (its world clock, factions, Oracle);
 * - `system`: the pack of the system a campaign or trip plays, or of a character's sheet;
 * - `packs`: a pack a campaign adds to its system's;
 * - `member`: a roster character playing on a map or in a trip;
 * - `place`: the map or trip a roster character plays in;
 * - `party`: a roster character in a party (the party's members).
 */
export type NeedReason =
  'dependency' | 'campaign' | 'system' | 'packs' | 'member' | 'place' | 'party'

export interface Need {
  /** The key of what's needed (`pack:core`, `campaign:c1`…). */
  key: string
  why: NeedReason
}

/** One thing that can be exported or imported. */
export interface Item {
  /** `<kind>:<id>`, unique among all. */
  key: string
  kind: ItemKind
  id: string
  /** As the user named it; may be empty (a trip not named yet). */
  name: string
  /** A map's or trip's campaign, by key, when that campaign is kept too (the tree nests it there). */
  campaign?: string
  /** A copy of a pack whose licence allows only personal use. */
  personal?: boolean
  /** What it needs to work elsewhere, whether kept or not. */
  needs: Need[]
}

export const keyOf = (kind: ItemKind, id: string): string => `${kind}:${id}`

/** The pack a `pack/id` reference (a system, a sheet) comes from. */
const packOf = (ref: unknown): string | undefined =>
  typeof ref === 'string' && ref !== '' ? ref.split('/')[0] : undefined

const json = (text: string): Record<string, unknown> => {
  try {
    const value: unknown = JSON.parse(text)
    return isRecord(value) ? value : {}
  } catch {
    return {}
  }
}

/** A pack's name and the packs its manifest depends on. */
function manifest(pack: KeptPack): { name: string; dependencies: string[] } {
  const content = pack.files.find((f) => f.path === 'pack.yaml')?.content ?? ''
  try {
    const data: unknown = parseYaml(content)
    if (!isRecord(data)) return { name: '', dependencies: [] }
    const name = isRecord(data.name)
      ? String(Object.values(data.name)[0] ?? '')
      : typeof data.name === 'string'
        ? data.name
        : ''
    const deps = data.dependencies
    const dependencies = Array.isArray(deps)
      ? deps
          .map((d) => (typeof d === 'string' ? d : isRecord(d) ? d.id : undefined))
          .filter((d): d is string => typeof d === 'string')
      : isRecord(deps)
        ? Object.keys(deps)
        : []
    return { name, dependencies }
  } catch {
    return { name: '', dependencies: [] }
  }
}

/** The campaign a stored map is in (a map saved before campaigns is in one with its id). */
function mapCampaign(text: string): string | undefined {
  const meta = json(text).meta
  if (!isRecord(meta)) return undefined
  const campaign = typeof meta.campaign === 'string' ? meta.campaign : meta.id
  return typeof campaign === 'string' ? campaign : undefined
}

const unique = (needs: Need[]): Need[] =>
  needs.filter((n, i) => needs.findIndex((m) => m.key === n.key) === i)

/**
 * Everything kept, as items with what each needs. `personal` lists the packs whose licence
 * allows only personal use (a user's copy of one is marked).
 */
export function listItems(kept: Kept, personal: ReadonlySet<string> = new Set()): Item[] {
  const items: Item[] = []
  const campaigns = new Set(kept.campaigns.map((c) => c.id))
  const places = new Map<string, string[]>()
  for (const entry of kept.characters) {
    const playing = (entry as { playing?: unknown }).playing
    if (!isRecord(playing) || typeof playing.id !== 'string') continue
    const kind = playing.app === 'map' ? 'map' : playing.app === 'travel' ? 'trip' : undefined
    if (!kind) continue
    const key = keyOf(kind, playing.id)
    places.set(key, [...(places.get(key) ?? []), characterIdOf(entry)!])
  }
  const members = (key: string): Need[] =>
    (places.get(key) ?? []).map((id) => ({ key: keyOf('character', id), why: 'member' }))

  for (const pack of kept.packs) {
    const { name, dependencies } = manifest(pack)
    items.push({
      key: keyOf('pack', pack.root),
      kind: 'pack',
      id: pack.root,
      name: name || pack.root,
      ...(personal.has(pack.root) && { personal: true }),
      needs: dependencies.map((d) => ({ key: keyOf('pack', d), why: 'dependency' })),
    })
  }
  for (const entry of kept.campaigns) {
    const campaign = json(entry.json)
    const system = packOf(campaign.system)
    const packs = Array.isArray(campaign.packs)
      ? campaign.packs.filter((p) => typeof p === 'string')
      : []
    items.push({
      key: keyOf('campaign', entry.id),
      kind: 'campaign',
      id: entry.id,
      name: entry.name,
      needs: unique([
        ...(system ? [{ key: keyOf('pack', system), why: 'system' as const }] : []),
        ...packs.map((p) => ({ key: keyOf('pack', p), why: 'packs' as const })),
      ]),
    })
  }
  for (const entry of kept.maps) {
    const campaign = mapCampaign(entry.json)
    const key = keyOf('map', entry.id)
    items.push({
      key,
      kind: 'map',
      id: entry.id,
      name: entry.name,
      ...(campaign && campaigns.has(campaign) && { campaign: keyOf('campaign', campaign) }),
      needs: [
        ...(campaign ? [{ key: keyOf('campaign', campaign), why: 'campaign' as const }] : []),
        ...members(key),
      ],
    })
  }
  for (const trip of kept.trips) {
    const id = trip.id as string
    const campaign = typeof trip.campaign === 'string' ? trip.campaign : undefined
    const system = packOf(trip.system)
    const key = keyOf('trip', id)
    items.push({
      key,
      kind: 'trip',
      id,
      name: typeof trip.name === 'string' ? trip.name : '',
      ...(campaign && campaigns.has(campaign) && { campaign: keyOf('campaign', campaign) }),
      needs: unique([
        ...(campaign ? [{ key: keyOf('campaign', campaign), why: 'campaign' as const }] : []),
        ...(system ? [{ key: keyOf('pack', system), why: 'system' as const }] : []),
        ...members(key),
      ]),
    })
  }
  for (const entry of kept.characters) {
    const character = entry.character as Record<string, unknown>
    const playing = entry.playing
    const place =
      isRecord(playing) && typeof playing.id === 'string'
        ? playing.app === 'map'
          ? keyOf('map', playing.id)
          : playing.app === 'travel'
            ? keyOf('trip', playing.id)
            : undefined
        : undefined
    const sheet = packOf(character.sheet)
    items.push({
      key: keyOf('character', character.id as string),
      kind: 'character',
      id: character.id as string,
      name: typeof character.name === 'string' ? character.name : '',
      needs: [
        ...(sheet ? [{ key: keyOf('pack', sheet), why: 'system' as const }] : []),
        ...(place ? [{ key: place, why: 'place' as const }] : []),
        // A party's members.
        ...(Array.isArray(entry.members)
          ? entry.members
              .filter((m): m is string => typeof m === 'string')
              .map((m) => ({ key: keyOf('character', m), why: 'party' as const }))
          : []),
      ],
    })
  }
  return items
}

/** A chosen item needing another that could go too but doesn't. */
export interface Missing {
  item: Item
  need: Need
  /** What it needs. */
  target: Item
}

/**
 * What the chosen items need that isn't chosen, among `items`, nor `present` (what the
 * browser importing already has). Needs of things not among the items (a pack that comes
 * with the apps) aren't asked for.
 */
export function missing(
  items: readonly Item[],
  chosen: ReadonlySet<string>,
  present: ReadonlySet<string> = new Set(),
): Missing[] {
  const byKey = new Map(items.map((i) => [i.key, i]))
  const out: Missing[] = []
  for (const item of items) {
    if (!chosen.has(item.key)) continue
    for (const need of item.needs) {
      const target = byKey.get(need.key)
      if (target && !chosen.has(need.key) && !present.has(need.key))
        out.push({ item, need, target })
    }
  }
  return out
}

/** The chosen items and everything they need, as far as it goes. */
export function withMissing(
  items: readonly Item[],
  chosen: ReadonlySet<string>,
  present: ReadonlySet<string> = new Set(),
): Set<string> {
  const out = new Set(chosen)
  for (let found = missing(items, out, present); found.length; found = missing(items, out, present))
    for (const m of found) out.add(m.target.key)
  return out
}
