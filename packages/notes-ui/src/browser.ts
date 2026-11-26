import { deserializeCampaign, type Campaign } from '@open-tabletop/campaign'
import { roster } from '@open-tabletop/character-ui'
import { readMap, type HexMap } from '@open-tabletop/map'
import { newPage, pageJson, readPageJson, type NotePage } from '@open-tabletop/notes'
import {
  allCampaigns,
  allLibraryMaps,
  allNotes,
  deleteNoteEntry,
  onAnyCampaignChange,
  onAnyNoteChange,
  onLibraryChange,
  putNoteEntry,
  ROSTER_KEY,
  updateNotes,
  type LibraryEntry,
} from '@open-tabletop/storage'
import { gameIndex, type FactionNamer, type GameIndex } from './game'

/**
 * The games' things as this browser keeps them (the roster, the campaigns, the maps); the
 * factions named by their systems (`factionName`), when the host has the packs.
 */
export async function loadGameIndex(factionName?: FactionNamer): Promise<GameIndex> {
  const campaigns: Campaign[] = []
  for (const entry of await allCampaigns().catch(() => []))
    try {
      campaigns.push(deserializeCampaign(entry.json))
    } catch {
      // A campaign this version can't read: left out.
    }
  const maps: HexMap[] = []
  for (const entry of await allLibraryMaps().catch(() => []))
    try {
      maps.push(readMap(entry.json).map)
    } catch {
      // Likewise.
    }
  return gameIndex(roster.roster, campaigns, maps, factionName)
}

const entryOf = (page: NotePage): LibraryEntry => ({
  id: page.id,
  name: page.path,
  modified: page.modified,
  json: pageJson(page),
  ...(page.campaign ? { parent: page.campaign } : {}),
})

/** Every page kept in this browser. */
export async function loadPages(): Promise<NotePage[]> {
  return (await allNotes())
    .map((entry) => readPageJson(entry.json))
    .filter((page): page is NotePage => page !== null)
}

export const savePage = (page: NotePage): Promise<void> => putNoteEntry(entryOf(page))

/** Writes several pages at once (a rename, an import). */
export const savePages = (pages: NotePage[]): Promise<void> => updateNotes(pages.map(entryOf))

export const deletePage = (id: string): Promise<void> => deleteNoteEntry(id)

/** A new page's id: random, never shown. */
export const newPageId = (): string =>
  `p${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`

/** A new page, kept at once. */
export async function createPage(
  path: string,
  campaign: string | undefined,
  body = '',
): Promise<NotePage> {
  const page = newPage(newPageId(), path, campaign, new Date().toISOString(), body)
  await savePage(page)
  return page
}

/**
 * The pages and the games' things, read now and again whenever they change here or in
 * another app (pages, campaigns, maps, the roster), each handed to its listener; returns a
 * stop. Resolves once both have been read the first time.
 */
export async function watchNotes(
  on: { pages: (pages: NotePage[]) => void; index: (index: GameIndex) => void },
  factionName?: FactionNamer,
): Promise<() => void> {
  let stopped = false
  const readPages = async () => {
    const pages = await loadPages().catch(() => [])
    if (!stopped) on.pages(pages)
  }
  const readIndex = async () => {
    const index = await loadGameIndex(factionName)
    if (!stopped) on.index(index)
  }
  const stops = [
    onAnyNoteChange(() => void readPages()),
    onAnyCampaignChange(() => void readIndex()),
    onLibraryChange(() => void readIndex()),
  ]
  const onStorage = (e: StorageEvent) => {
    if (e.key === ROSTER_KEY || e.key === null) void readIndex()
  }
  window.addEventListener('storage', onStorage)
  await Promise.all([readPages(), readIndex()])
  return () => {
    stopped = true
    stops.forEach((stop) => stop())
    window.removeEventListener('storage', onStorage)
  }
}
