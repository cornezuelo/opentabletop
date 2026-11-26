/* eslint-disable svelte/prefer-svelte-reactivity -- dates, maps and URLs here are plain values, never state */
import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate'
import { readCampaignJournal } from '@open-tabletop/journal-ui'
import {
  cleanNotePath,
  filesToPages,
  findPage,
  formatLink,
  linkMentions,
  mergePages,
  pagesToFiles,
  pageTitle,
  pathTaken,
  readLink,
  renamePage,
  textLinksTo,
  GENERAL_FOLDER,
  type NotePage,
} from '@open-tabletop/notes'
import {
  createPage,
  deletePage,
  emptyGameIndex,
  gameUrl,
  linkedThing,
  linkFromUrl,
  loadGameIndex,
  loadPages,
  newPageId,
  savePage,
  savePages,
  type GameIndex,
  type NoteSection,
} from '@open-tabletop/notes-ui'
import {
  onAnyCampaignChange,
  onAnyNoteChange,
  onLibraryChange,
  ROSTER_KEY,
} from '@open-tabletop/storage'
import { playing } from '@open-tabletop/ui-kit'
import { t, ui } from './i18n'
import { nameFaction } from './packs.svelte'
import { go, type View } from './nav.svelte'

/**
 * The pages and the games' things as this browser keeps them, read again whenever they
 * change here or in another app, and what's done to them.
 */
export const notes = $state<{ pages: NotePage[]; index: GameIndex; loaded: boolean }>({
  pages: [],
  index: emptyGameIndex(),
  loaded: false,
})

async function readPages(): Promise<void> {
  notes.pages = await loadPages()
}

async function readIndex(): Promise<void> {
  notes.index = await loadGameIndex(nameFaction)
}

/** Reads everything, and keeps reading it as it changes; returns a stop. */
export async function startNotes(): Promise<() => void> {
  await Promise.all([readPages(), readIndex()])
  notes.loaded = true
  const stops = [
    onAnyNoteChange(() => void readPages()),
    onAnyCampaignChange(() => void readIndex()),
    onLibraryChange(() => void readIndex()),
  ]
  const onStorage = (e: StorageEvent) => {
    if (e.key === ROSTER_KEY || e.key === null) void readIndex()
  }
  window.addEventListener('storage', onStorage)
  return () => {
    stops.forEach((stop) => stop())
    window.removeEventListener('storage', onStorage)
  }
}

/** The tree's sections: the campaign being played first, General, then the others by name. */
export function sections(): NoteSection[] {
  const names = { ...notes.index.campaigns }
  for (const page of notes.pages)
    if (page.campaign && !(page.campaign in names)) names[page.campaign] = page.campaign
  const others = Object.entries(names)
    .filter(([id]) => id !== playing.id)
    .sort(([, a], [, b]) => a.localeCompare(b))
  const current = playing.id && names[playing.id] ? [[playing.id, names[playing.id]]] : []
  return [
    ...current.map(([id, name]) => ({ key: id, campaign: id, name })),
    { key: '', name: ui('general') },
    ...others.map(([id, name]) => ({ key: id, campaign: id, name })),
  ]
}

export const campaignName = (id: string | undefined): string =>
  id ? (notes.index.campaigns[id] ?? id) : GENERAL_FOLDER

/** A path free in `campaign`, `path` or `path 2`, `path 3`… */
function freePath(path: string, campaign: string | undefined, except?: string): string {
  const clean = cleanNotePath(path) || t('page.untitled')
  let free = clean
  for (let n = 2; pathTaken(notes.pages, free, campaign, except); n++) free = `${clean} ${n}`
  return free
}

/** Keeps a page as changed, here at once and in the browser. */
export async function changePage(page: NotePage, change: Partial<NotePage>): Promise<void> {
  const next = { ...page, ...change, modified: new Date().toISOString() }
  notes.pages = notes.pages.map((p) => (p.id === page.id ? next : p))
  await savePage(next)
}

/** Makes a page in `campaign`'s `folder` (Untitled) and opens it. */
export async function newPageIn(
  campaign: string | undefined,
  folder = '',
  title = t('page.untitled'),
  body = '',
): Promise<NotePage> {
  const page = await createPage(
    freePath(folder ? `${folder}/${title}` : title, campaign),
    campaign,
    body,
  )
  notes.pages = [...notes.pages, page]
  go({ name: 'page', id: page.id })
  return page
}

/**
 * Moves a page to `path` and changes the links that reached it; false if another page of its
 * campaign is there.
 */
export async function renameTo(page: NotePage, path: string): Promise<boolean> {
  const clean = cleanNotePath(path)
  if (!clean || clean === page.path) return true
  if (pathTaken(notes.pages, clean, page.campaign, page.id)) return false
  const changed = renamePage(notes.pages, page, clean, new Date().toISOString())
  const byId = new Map(changed.map((p) => [p.id, p]))
  notes.pages = notes.pages.map((p) => byId.get(p.id) ?? p)
  await savePages(changed)
  return true
}

/** Moves a page to another campaign (or General), at a free path there. */
export async function moveToCampaign(page: NotePage, campaign: string | undefined): Promise<void> {
  if ((page.campaign ?? undefined) === campaign) return
  const rest: NotePage = { ...page }
  delete rest.campaign
  await changePage(rest, {
    path: freePath(page.path, campaign, page.id),
    ...(campaign ? { campaign } : {}),
  })
}

export async function removePage(page: NotePage): Promise<void> {
  notes.pages = notes.pages.filter((p) => p.id !== page.id)
  await deletePage(page.id)
}

/** The mentions of `page`'s title in `other` made links to it. */
export async function linkIn(other: NotePage, page: NotePage): Promise<void> {
  await changePage(other, { body: linkMentions(other.body, pageTitle(page)) })
}

/**
 * A `noteRef` opened from another app: the page it reaches from its campaign (or the one
 * being played), or a new one there, linking back to the thing (`from`) when it says what.
 */
export async function openRef(view: Extract<View, { name: 'ref' }>): Promise<void> {
  const campaign = view.campaign ?? playing.id
  const found = findPage(notes.pages, view.path, campaign)
  if (found) return go({ name: 'page', id: found.id }, true)
  const from = view.from ? readLink(view.from) : null
  const backlink =
    from && from.kind !== 'page'
      ? `${formatLink({ kind: from.kind, target: from.target, ...(from.heading ? { heading: from.heading } : {}) })}\n\n`
      : ''
  // Not a known campaign (a link from another browser): General.
  const where = campaign && notes.index.campaigns[campaign] ? campaign : undefined
  const page = await createPage(freePath(view.path, where), where, backlink)
  notes.pages = [...notes.pages, page]
  go({ name: 'page', id: page.id }, true)
}

/** The lines of the campaigns' Logs' notes that link to `page` (its campaign's, or all). */
export async function journalLines(page: NotePage): Promise<string[]> {
  const campaigns = page.campaign ? [page.campaign] : Object.keys(notes.index.campaigns)
  const lines: string[] = []
  for (const id of campaigns) {
    const journal = await readCampaignJournal(id).catch(() => undefined)
    for (const item of journal?.items ?? [])
      if (item.kind === 'note')
        for (const link of textLinksTo(notes.pages, item.text, id, page)) {
          const start = item.text.lastIndexOf('\n', link.from - 1) + 1
          const end = item.text.indexOf('\n', link.from)
          lines.push(item.text.slice(start, end < 0 ? undefined : end).trim())
        }
  }
  return lines
}

/** Every page as a .zip of .md files. */
export function exportZip(): Uint8Array {
  const files = pagesToFiles(notes.pages, {
    campaignFolder: (id) => notes.index.campaigns[id] ?? id,
    gameLink: (link) => {
      const url = gameUrl(link)
      if (!url) return null
      const absolute = new URL(url, location.href).href
      return {
        text: link.alias ?? linkedThing(notes.index, link)?.name ?? link.target,
        url: absolute,
      }
    },
  })
  return zipSync(
    Object.fromEntries(Object.entries(files).map(([path, text]) => [path, strToU8(text)])),
  )
}

/** Files chosen to import (a .zip, or .md files) as files by path. */
export async function readChosen(files: File[]): Promise<Record<string, string>> {
  const out: Record<string, string> = {}
  for (const file of files) {
    if (/\.zip$/i.test(file.name)) {
      const unzipped = unzipSync(new Uint8Array(await file.arrayBuffer()))
      for (const [path, data] of Object.entries(unzipped))
        if (/\.md$/i.test(path)) out[path] = strFromU8(data)
    } else if (/\.md$/i.test(file.name))
      out[file.webkitRelativePath || file.name] = await file.text()
  }
  return out
}

/** Pages read from files, put among those here: what's written and how many replaced. */
export function planImport(files: Record<string, string>, into: string | undefined) {
  const byName = new Map(
    Object.entries(notes.index.campaigns).map(([id, name]) => [name.toLocaleLowerCase(), id]),
  )
  const imported = filesToPages(files, {
    campaignOfFolder: (folder) =>
      folder.toLocaleLowerCase() === GENERAL_FOLDER.toLocaleLowerCase()
        ? ''
        : (byName.get(folder.toLocaleLowerCase()) ?? null),
    ...(into ? { into } : {}),
    gameLinkOf: linkFromUrl,
    newId: newPageId,
    now: new Date().toISOString(),
  })
  return mergePages(notes.pages, imported)
}

export async function writeImport(put: NotePage[]): Promise<void> {
  await savePages(put)
  await readPages()
}
