import type { Campaign } from '@open-tabletop/campaign'
import { characterUrl } from '@open-tabletop/character-ui'
import { formatCoord, parseKey, type HexKey } from '@open-tabletop/hex'
import type { HexMap } from '@open-tabletop/map'
import type { GameLinkKind, NoteLink } from '@open-tabletop/notes'
import type { Roster } from '@open-tabletop/session'
import { appUrl, campaignUrl } from '@open-tabletop/ui-kit'

/**
 * The games' things a page can link to, and those whose `noteRef` points at a page: the
 * roster's characters, the campaigns and their factions, the maps and their named cells
 * (and the places, regions and tokens with a note of their own). Read from what this
 * browser keeps; Notes reads them again when they change.
 */
export interface GameThing {
  kind: GameLinkKind
  /** What's written in a link to it, without `[[ ]]`: `character:kael`, `map:a1b2#0608`. */
  link: string
  name: string
  /** Where it is (its map's or campaign's name), to tell alike names apart. */
  where?: string
  /** The campaign it's in, if any. */
  campaign?: string
  /** Its page in the notes (`noteRef`), if it has one; a cell's place or token's, theirs. */
  noteRef?: string
  /** Not linked to directly (a place, a region, a token: its cell or map is). */
  only?: 'noteRef'
}

export interface GameIndex {
  things: GameThing[]
  /** Campaigns' names, by id (the tree's sections, the export's folders). */
  campaigns: Record<string, string>
}

export const emptyGameIndex = (): GameIndex => ({ things: [], campaigns: {} })

/** A cell's label in a link (`0608`), as Map's deep links read it. */
export const cellLabel = (map: Pick<HexMap, 'grid'>, key: string): string =>
  formatCoord(parseKey(key as HexKey), 'CCRR', map.grid)

/**
 * A faction's name, as its campaign's system names it (the campaign keeps only its id and
 * values); undefined: not known (its pack isn't loaded), and its id is shown.
 */
export type FactionNamer = (campaign: Campaign, faction: string) => string | undefined

/** The things of what's kept, in order: campaigns, factions, characters, maps, cells. */
export function gameIndex(
  roster: Roster,
  campaigns: Campaign[],
  maps: HexMap[],
  factionName: FactionNamer = () => undefined,
): GameIndex {
  const things: GameThing[] = []
  const names: Record<string, string> = {}
  for (const c of campaigns) {
    names[c.id] = c.name || c.id
    things.push({
      kind: 'campaign',
      link: `campaign:${c.id}`,
      name: c.name || c.id,
      campaign: c.id,
      ...(c.noteRef ? { noteRef: c.noteRef } : {}),
    })
    for (const f of c.factions?.factions ?? []) {
      const noteRef = c.factions?.notes?.[f.id]?.noteRef
      things.push({
        kind: 'faction',
        link: `faction:${c.id}/${f.id}`,
        name: factionName(c, f.id) || f.name || f.id,
        where: c.name,
        campaign: c.id,
        ...(noteRef ? { noteRef } : {}),
      })
    }
  }
  for (const entry of roster.characters) {
    const c = entry.character
    things.push({
      kind: 'character',
      link: `character:${c.id}`,
      name: c.name || c.id,
      ...(entry.playing?.name ? { where: entry.playing.name } : {}),
      ...(entry.noteRef ? { noteRef: entry.noteRef } : {}),
    })
  }
  for (const map of maps) {
    const id = map.meta.id
    const campaign = map.meta.campaign || undefined
    const mapName = map.meta.name || id
    const on = { where: mapName, ...(campaign ? { campaign } : {}) }
    things.push({
      kind: 'map',
      link: `map:${id}`,
      name: mapName,
      ...(campaign ? { campaign } : {}),
    })
    for (const [key, hex] of Object.entries(map.hexes)) {
      const label = cellLabel(map, key)
      const link = `map:${id}#${label}`
      if (hex.name || hex.note)
        things.push({
          kind: 'map',
          link,
          name: hex.name ? `${hex.name} (${label})` : label,
          ...on,
          ...(hex.note ? { noteRef: hex.note } : {}),
        })
      for (const poi of hex.pois ?? [])
        if (poi.note)
          things.push({
            kind: 'map',
            link,
            name: poi.name,
            ...on,
            noteRef: poi.note,
            only: 'noteRef',
          })
    }
    for (const r of map.regions)
      if (r.note)
        things.push({
          kind: 'map',
          link: `map:${id}`,
          name: r.name,
          ...on,
          noteRef: r.note,
          only: 'noteRef',
        })
    for (const t of map.tokens)
      if (t.note) {
        const link = t.hex ? `map:${id}#${cellLabel(map, t.hex)}` : `map:${id}`
        things.push({ kind: 'map', link, name: t.name, ...on, noteRef: t.note, only: 'noteRef' })
      }
  }
  return { things, campaigns: names }
}

/** The thing a link reaches (a cell not named: the map, called by its label). */
export function linkedThing(index: GameIndex, link: NoteLink): GameThing | undefined {
  if (link.kind === 'page') return undefined
  const written = `${link.kind}:${link.target}${link.heading ? `#${link.heading}` : ''}`
  const direct = index.things.find((t) => !t.only && t.link === written)
  if (direct || link.kind !== 'map' || !link.heading) return direct
  const map = index.things.find((t) => !t.only && t.link === `map:${link.target}`)
  return map && { ...map, link: written, name: `${link.heading} (${map.name})` }
}

/** Where a link into the games opens: the thing in its app. */
export function gameUrl(link: Pick<NoteLink, 'kind' | 'target' | 'heading'>): string | null {
  const id = link.target
  if (!id) return null
  switch (link.kind) {
    case 'character':
      return characterUrl(id)
    case 'campaign':
      return campaignUrl(id)
    case 'faction': {
      const [campaign, faction] = id.split('/')
      return campaign && faction
        ? `${campaignUrl(campaign, 'factions')}/${encodeURIComponent(faction)}`
        : null
    }
    case 'map':
      return `${appUrl('map')}#/${encodeURIComponent(id)}${link.heading ? `/${encodeURIComponent(link.heading)}` : ''}`
    default:
      return null
  }
}

/**
 * A URL of one of the apps (as `gameUrl` writes them, from any site) as a link into the
 * games again (`character:kael`), or null: how an exported folder's links come back.
 */
export function linkFromUrl(url: string): string | null {
  const hash = url.indexOf('#/')
  if (hash < 0) return null
  const app = /(?:^|\/)([a-z]+)\/?$/.exec(url.slice(0, hash))?.[1]
  const parts = url
    .slice(hash + 2)
    .split('/')
    .filter(Boolean)
  let decoded: string[]
  try {
    decoded = parts.map(decodeURIComponent)
  } catch {
    return null
  }
  if (app === 'characters' && decoded[0] === 'character' && decoded[1])
    return `character:${decoded[1]}`
  if (app === 'campaign' && decoded[0] === 'campaign' && decoded[1]) {
    if (decoded[2] === 'factions' && decoded[3]) return `faction:${decoded[1]}/${decoded[3]}`
    return decoded.length === 2 ? `campaign:${decoded[1]}` : null
  }
  if (app === 'map' && decoded[0] && /^[a-z0-9]+$/.test(decoded[0]) && decoded.length <= 2)
    return `map:${decoded[0]}${decoded[1] ? `#${decoded[1]}` : ''}`
  return null
}
