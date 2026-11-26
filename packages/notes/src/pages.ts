import { codeRanges, formatLink, parseLinks, rewriteLinks, type NoteLink } from './links'
import { cleanNotePath, pageFolder, pageTitle, pathKey, type NotePage } from './page'

/**
 * Pages among themselves: which page a link or a `noteRef` reaches, what links to a page,
 * where its title is written without a link, search, renames and the tree of folders.
 *
 * Where a link looks: a page of a campaign reaches the pages of that campaign first, then
 * General's; a page of General reaches General's only. Within each, a path written whole
 * (`npcs/Old Tobin`) first, then a title (`Old Tobin`); case doesn't matter.
 */

const sameCampaign = (page: NotePage, campaign: string | undefined) =>
  (page.campaign ?? undefined) === (campaign || undefined)

/** The pages a page of `campaign` may reach, in the order they're looked in. */
function scopes(pages: readonly NotePage[], campaign: string | undefined): NotePage[][] {
  const general = pages.filter((p) => !p.campaign)
  return campaign ? [pages.filter((p) => p.campaign === campaign), general] : [general]
}

const byPath = (a: NotePage, b: NotePage) => a.path.localeCompare(b.path)

/** The page `target` (a path or a title) names, seen from `campaign`'s pages. */
export function findPage(
  pages: readonly NotePage[],
  target: string,
  campaign: string | undefined,
): NotePage | undefined {
  const key = pathKey(target)
  if (!key) return undefined
  for (const scope of scopes(pages, campaign)) {
    const whole = scope.find((p) => pathKey(p.path) === key)
    if (whole) return whole
    if (!key.includes('/')) {
      const titled = scope.filter((p) => pageTitle(p).toLocaleLowerCase() === key).sort(byPath)
      if (titled.length) return titled[0]
    }
  }
  return undefined
}

/** The page a page link of `from` reaches (a link to a heading alone stays on `from`). */
export function linkedPage(
  pages: readonly NotePage[],
  link: Pick<NoteLink, 'kind' | 'target'>,
  from: Pick<NotePage, 'campaign'> & { id?: string },
): NotePage | undefined {
  if (link.kind !== 'page') return undefined
  if (!link.target && from.id) return pages.find((p) => p.id === from.id)
  return findPage(pages, link.target, from.campaign)
}

/** Whether a page's path is taken in its campaign (or General), but by `except`. */
export function pathTaken(
  pages: readonly NotePage[],
  path: string,
  campaign: string | undefined,
  except?: string,
): boolean {
  const key = pathKey(path)
  return pages.some((p) => p.id !== except && sameCampaign(p, campaign) && pathKey(p.path) === key)
}

/** The lines of `text` around each of `links`, for showing where a page is named. */
function linesOf(text: string, spots: { from: number }[]): string[] {
  const lines = new Set<string>()
  for (const { from } of spots) {
    const start = text.lastIndexOf('\n', from - 1) + 1
    const end = text.indexOf('\n', from)
    const line = text.slice(start, end < 0 ? undefined : end).trim()
    if (line) lines.add(line)
  }
  return [...lines]
}

/** Whether a text written in `campaign` (a page's, a journal's note) links to `page`. */
export function textLinksTo(
  pages: readonly NotePage[],
  text: string,
  campaign: string | undefined,
  page: NotePage,
): NoteLink[] {
  return parseLinks(text).filter(
    (l) => l.kind === 'page' && l.target && findPage(pages, l.target, campaign)?.id === page.id,
  )
}

export interface PageMention {
  page: NotePage
  /** The lines where it's named. */
  lines: string[]
}

/** The pages that link to `page`, by path. */
export function backlinks(pages: readonly NotePage[], page: NotePage): PageMention[] {
  return pages
    .filter((p) => p.id !== page.id)
    .map((p) => ({ page: p, links: textLinksTo(pages, p.body, p.campaign, page) }))
    .filter((m) => m.links.length)
    .sort((a, b) => byPath(a.page, b.page))
    .map(({ page: p, links }) => ({ page: p, lines: linesOf(p.body, links) }))
}

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** Where `title` is written in `text` as a word of its own, outside links and code. */
export function mentionsIn(text: string, title: string): { from: number; to: number }[] {
  if (!title.trim()) return []
  const skip = [
    ...codeRanges(text),
    ...parseLinks(text).map((l) => [l.from, l.to] as [number, number]),
  ]
  const word = new RegExp(`(?<![\\p{L}\\p{N}])${escapeRegExp(title)}(?![\\p{L}\\p{N}])`, 'giu')
  return [...text.matchAll(word)]
    .filter((m) => !skip.some(([a, b]) => m.index >= a && m.index < b))
    .map((m) => ({ from: m.index, to: m.index + m[0].length }))
}

/**
 * The pages that write `page`'s title without linking to it: those that could link to it
 * (its campaign's, or every page when it's General's).
 */
export function unlinkedMentions(pages: readonly NotePage[], page: NotePage): PageMention[] {
  const title = pageTitle(page)
  return pages
    .filter((p) => p.id !== page.id && (!page.campaign || p.campaign === page.campaign))
    .map((p) => ({ page: p, spots: mentionsIn(p.body, title) }))
    .filter((m) => m.spots.length)
    .sort((a, b) => byPath(a.page, b.page))
    .map(({ page: p, spots }) => ({ page: p, lines: linesOf(p.body, spots) }))
}

/** `text` with its mentions of `title` at `spots` made links to it. */
export function linkMentions(text: string, title: string): string {
  let out = ''
  let at = 0
  for (const spot of mentionsIn(text, title)) {
    const written = text.slice(spot.from, spot.to)
    out +=
      text.slice(at, spot.from) +
      formatLink({ kind: 'page', target: title, ...(written === title ? {} : { alias: written }) })
    at = spot.to
  }
  return out + text.slice(at)
}

export interface SearchHit {
  page: NotePage
  /** The title matched. */
  inTitle: boolean
  /** A line of the page around the first match in its text, if any. */
  snippet?: string
}

const fold = (text: string) => text.normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase()

/**
 * Pages with every word of `query` in their path or text (accents and case don't matter),
 * those whose path has them all first.
 */
export function searchPages(pages: readonly NotePage[], query: string): SearchHit[] {
  const words = fold(query).split(/\s+/).filter(Boolean)
  if (!words.length) return []
  const hits: (SearchHit & { score: number })[] = []
  for (const page of pages) {
    const path = fold(page.path)
    const body = fold(page.body)
    if (!words.every((w) => path.includes(w) || body.includes(w))) continue
    const inTitle = words.every((w) => path.includes(w))
    const first = words.map((w) => body.indexOf(w)).filter((i) => i >= 0)
    const at = first.length ? Math.min(...first) : -1
    const snippet = at >= 0 ? linesOf(page.body, [{ from: at }])[0] : undefined
    hits.push({ page, inTitle, ...(snippet ? { snippet } : {}), score: inTitle ? 0 : 1 })
  }
  return hits
    .sort((a, b) => a.score - b.score || byPath(a.page, b.page))
    .map(({ page, inTitle, snippet }) => ({ page, inTitle, ...(snippet ? { snippet } : {}) }))
}

/**
 * A page moved to `path`, and the pages whose links reached it changed to reach it there
 * (a link written as a path gets the new path; one written as a title, the new title; its
 * heading and text kept). Gives every page that changed, the moved one first.
 */
export function renamePage(
  pages: readonly NotePage[],
  page: NotePage,
  path: string,
  now: string,
): NotePage[] {
  const moved: NotePage = { ...page, path: cleanNotePath(path), modified: now }
  const after = pages.map((p) => (p.id === page.id ? moved : p))
  const changed: NotePage[] = [moved]
  for (const p of after) {
    const source = p.id === page.id ? moved : p
    const body = rewriteLinks(source.body, (link) => {
      if (link.kind !== 'page' || !link.target) return null
      if (findPage(pages, link.target, source.campaign)?.id !== page.id) return null
      const target = link.target.includes('/') ? moved.path : pageTitle(moved)
      // Written as a title that now reaches another page: write the path.
      const reached = findPage(after, target, source.campaign)?.id === page.id
      return formatLink({ ...link, target: reached ? target : moved.path })
    })
    if (body === source.body) continue
    if (p.id === page.id) moved.body = body
    else changed.push({ ...p, body, modified: now })
  }
  return changed
}

/** A folder of the tree: its name, its folders and its pages, each by name. */
export interface NoteFolder {
  name: string
  /** Its path from the top ('' for the top). */
  path: string
  folders: NoteFolder[]
  pages: NotePage[]
}

/** Pages as a tree of folders, by name (folders first). */
export function pageTree(pages: readonly NotePage[]): NoteFolder {
  const top: NoteFolder = { name: '', path: '', folders: [], pages: [] }
  for (const page of pages) {
    let folder = top
    for (const name of pageFolder(page).split('/').filter(Boolean)) {
      let next = folder.folders.find((f) => f.name.toLocaleLowerCase() === name.toLocaleLowerCase())
      if (!next) {
        next = { name, path: folder.path ? `${folder.path}/${name}` : name, folders: [], pages: [] }
        folder.folders.push(next)
      }
      folder = next
    }
    folder.pages.push(page)
  }
  const sort = (folder: NoteFolder) => {
    folder.folders.sort((a, b) => a.name.localeCompare(b.name))
    folder.pages.sort((a, b) => pageTitle(a).localeCompare(pageTitle(b)))
    folder.folders.forEach(sort)
  }
  sort(top)
  return top
}

/** The headings of a page's Markdown (`## Secrets`), for linking to one. */
export function pageHeadings(body: string): string[] {
  const code = codeRanges(body)
  return [...body.matchAll(/^#{1,6}\s+(.+?)\s*#*\s*$/gm)]
    .filter((m) => !code.some(([a, b]) => m.index >= a && m.index < b))
    .map((m) => m[1])
}
