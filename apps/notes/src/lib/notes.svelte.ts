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
  PICTURES_FOLDER,
  picturesIn,
  picturesOfFiles,
  safeName,
  type NotePage,
} from '@open-tabletop/notes'
import { bytesToDataUrl, dataUrlToBytes } from '@open-tabletop/oracle-engine'
import {
  allImages,
  getImage,
  IMAGE_FORMAT,
  putImage,
  readImage,
  type LibraryImage,
} from '@open-tabletop/storage'
import {
  createPage,
  deletePage,
  emptyGameIndex,
  gameUrl,
  linkedThing,
  linkFromUrl,
  loadPages,
  newPageId,
  savePage,
  savePages,
  watchNotes,
  type GameIndex,
  type NoteSection,
} from '@open-tabletop/notes-ui'
import { playing } from '@open-tabletop/ui-kit'
import { getLocale, t, ui } from './i18n'
import { welcomePage } from './welcome'
import { nameFaction } from './packs.svelte'
import { go, nav, type View } from './nav.svelte'

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

/** Reads everything, and keeps reading it as it changes; returns a stop. */
export async function startNotes(): Promise<() => void> {
  const stop = await watchNotes(
    {
      pages: (pages) => (notes.pages = pages),
      index: (index) => (notes.index = index),
    },
    nameFaction,
  )
  notes.loaded = true
  await welcomeOnce()
  return stop
}

/** Remembers that Notes wrote its welcome page once (so a page deleted stays deleted). */
const WELCOMED = 'opentabletop.notes.welcomed'

/**
 * The first time Notes opens with no pages, its welcome page in General (what it's for, a
 * cheat sheet of Markdown and links), opened when nothing else is asked for.
 */
async function welcomeOnce(): Promise<void> {
  let welcomed: boolean
  try {
    welcomed = localStorage.getItem(WELCOMED) !== null
    localStorage.setItem(WELCOMED, new Date().toISOString())
  } catch {
    return
  }
  if (welcomed || notes.pages.length) return
  const { title, body } = welcomePage(getLocale())
  const page = await createPage(title, undefined, body)
  await readPages()
  // Only when nothing else was asked for (a note opened from another app).
  if (nav.view.name === 'welcome') go({ name: 'page', id: page.id })
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

const EXTENSIONS: Record<string, string> = {
  'image/webp': 'webp',
  'image/jpeg': 'jpg',
  'image/png': 'png',
}

/** The library's pictures the pages show, each a file of the export's `pictures/` folder. */
async function picturesToExport(): Promise<Map<string, { path: string; bytes: Uint8Array }>> {
  const out = new Map<string, { path: string; bytes: Uint8Array }>()
  const taken = new Set<string>()
  for (const id of new Set(notes.pages.flatMap((p) => picturesIn(p.body)))) {
    const image = await getImage(id).catch(() => null)
    if (!image) continue
    const mime = /^data:([^;,]+)/.exec(image.data)?.[1] ?? ''
    const extension = EXTENSIONS[mime]
    if (!extension) continue
    const base = safeName(image.name || id)
    let name = base
    for (let n = 2; taken.has(name.toLocaleLowerCase()); n++) name = `${base} ${n}`
    taken.add(name.toLocaleLowerCase())
    out.set(id, {
      path: `${PICTURES_FOLDER}/${name}.${extension}`,
      bytes: dataUrlToBytes(image.data),
    })
  }
  return out
}

/** Every page as a .zip of .md files, with the pictures they show in `pictures/`. */
export async function exportZip(): Promise<Uint8Array> {
  const pictures = await picturesToExport()
  const files = pagesToFiles(notes.pages, {
    pictureFile: (id) => pictures.get(id)?.path ?? null,
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
  return zipSync({
    ...Object.fromEntries(Object.entries(files).map(([path, text]) => [path, strToU8(text)])),
    ...Object.fromEntries([...pictures.values()].map((p) => [p.path, p.bytes])),
  })
}

/** Files chosen to import: the pages' texts, and the pictures beside them, by path. */
export interface ChosenFiles {
  texts: Record<string, string>
  pictures: Record<string, Uint8Array>
}

const PICTURE_FILE = /\.(webp|png|jpe?g)$/i

/** Files chosen to import (a .zip, or .md files and their pictures) by path. */
export async function readChosen(files: File[]): Promise<ChosenFiles> {
  const out: ChosenFiles = { texts: {}, pictures: {} }
  for (const file of files) {
    if (/\.zip$/i.test(file.name)) {
      const unzipped = unzipSync(new Uint8Array(await file.arrayBuffer()))
      for (const [path, data] of Object.entries(unzipped))
        if (/\.md$/i.test(path)) out.texts[path] = strFromU8(data)
        else if (PICTURE_FILE.test(path)) out.pictures[path] = data
    } else if (/\.md$/i.test(file.name))
      out.texts[file.webkitRelativePath || file.name] = await file.text()
    else if (PICTURE_FILE.test(file.name))
      out.pictures[file.webkitRelativePath || file.name] = new Uint8Array(await file.arrayBuffer())
  }
  return out
}

/** A picture's size, read from its bytes (0 × 0 if the browser can't read it). */
async function pictureSize(data: string): Promise<{ width: number; height: number }> {
  try {
    const bitmap = await createImageBitmap(await (await fetch(data)).blob())
    const size = { width: bitmap.width, height: bitmap.height }
    bitmap.close()
    return size
  } catch {
    return { width: 0, height: 0 }
  }
}

/**
 * The pictures the pages name among the files, as images of the library: one it has already
 * (the same picture) is that one, the others new (kept when the import is written).
 */
async function picturesToImport(chosen: ChosenFiles): Promise<{
  ids: Map<string, string>
  keep: LibraryImage[]
}> {
  const ids = new Map<string, string>()
  const keep: LibraryImage[] = []
  const wanted = picturesOfFiles(chosen.texts).filter((path) => chosen.pictures[path])
  if (!wanted.length) return { ids, keep }
  const here = new Map(
    (await allImages().catch(() => [])).flatMap((e) => {
      const image = readImage(e)
      return image ? [[image.data, image.id] as const] : []
    }),
  )
  for (const path of wanted) {
    const data = bytesToDataUrl(chosen.pictures[path], path)
    if (!data.startsWith('data:image/')) continue
    const same = here.get(data)
    if (same) {
      ids.set(path, same)
      continue
    }
    const image: LibraryImage = {
      id: crypto.randomUUID(),
      name: (path.split('/').pop() ?? path).replace(PICTURE_FILE, ''),
      modified: new Date().toISOString(),
      format: IMAGE_FORMAT,
      data,
      ...(await pictureSize(data)),
      tags: [],
      use: 'note',
    }
    here.set(data, image.id)
    ids.set(path, image.id)
    keep.push(image)
  }
  return { ids, keep }
}

/**
 * Pages read from files, put among those here: what's written, how many replaced, and the
 * pictures to keep in the library with them.
 */
export async function planImport(chosen: ChosenFiles, into: string | undefined) {
  const pictures = await picturesToImport(chosen)
  return { ...planPages(chosen.texts, into, pictures.ids), pictures: pictures.keep }
}

/** Pages read from files (no pictures among them), put among those here. */
export function planPages(
  files: Record<string, string>,
  into: string | undefined,
  pictures: ReadonlyMap<string, string> = new Map(),
) {
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
    pictureOf: (path) => pictures.get(path) ?? null,
    newId: newPageId,
    now: new Date().toISOString(),
  })
  return mergePages(notes.pages, imported)
}

export async function writeImport(
  put: NotePage[],
  pictures: readonly LibraryImage[] = [],
): Promise<void> {
  for (const image of pictures) await putImage(image)
  await savePages(put)
  await readPages()
}
