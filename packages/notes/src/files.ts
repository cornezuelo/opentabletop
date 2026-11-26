import { formatLink, readLink, rewriteLinks, type NoteLink } from './links'
import { cleanNotePath, newPage, pathKey, type NotePage } from './page'

/**
 * Pages as a folder of `.md` files and back (docs/notes-and-journal.md §9): what Obsidian or
 * SilverBullet open as they are. Each campaign is a folder by its name, General another;
 * links between pages stay `[[…]]`, links into the games become ordinary Markdown links to
 * the apps (which come back as links into the games when imported).
 */

/** The name of General's folder in an export. */
export const GENERAL_FOLDER = 'General'

/** A file or folder name without the characters file systems refuse. */
export const safeName = (name: string): string =>
  name
    .replace(/[\\:*?"<>|]/g, '-')
    .replace(/^\.+/, '')
    .trim() || '-'

export interface ExportOptions {
  /** The folder of a campaign's pages (its name). */
  campaignFolder: (campaign: string) => string
  /** A link into the games as a Markdown link's text and URL; null keeps it as it is. */
  gameLink: (link: NoteLink) => { text: string; url: string } | null
}

/** Pages as files, by path in the folder (`Vale/npcs/Old Tobin.md`). */
export function pagesToFiles(
  pages: readonly NotePage[],
  options: ExportOptions,
): Record<string, string> {
  const files: Record<string, string> = {}
  const folders = new Map<string, string>()
  const folderOf = (campaign: string | undefined) => {
    const key = campaign ?? ''
    if (!folders.has(key)) {
      const taken = new Set(folders.values())
      let name = safeName(campaign ? options.campaignFolder(campaign) : GENERAL_FOLDER)
      for (let n = 2; taken.has(name); n++)
        name = `${safeName(campaign ? options.campaignFolder(campaign) : GENERAL_FOLDER)} ${n}`
      folders.set(key, name)
    }
    return folders.get(key)!
  }
  for (const page of pages) {
    const body = rewriteLinks(page.body, (link) => {
      if (link.kind === 'page') return null
      const made = options.gameLink(link)
      return made ? `[${made.text.replace(/[[\]]/g, '')}](${made.url})` : null
    })
    const path = cleanNotePath(page.path).split('/').map(safeName).join('/')
    let name = `${folderOf(page.campaign)}/${path}`
    for (let n = 2; files[`${name}.md`] !== undefined; n++)
      name = `${folderOf(page.campaign)}/${path} ${n}`
    files[`${name}.md`] = body
  }
  return files
}

export interface ImportOptions {
  /**
   * The campaign a top folder of the files is (by its name): its id, `''` for General, or
   * null when it isn't one (its files go `into`).
   */
  campaignOfFolder: (folder: string) => string | null
  /** Where files that aren't in a campaign's folder go (absent: General). */
  into?: string
  /** A Markdown link's URL as a link into the games (`character:kael`), or null. */
  gameLinkOf: (url: string) => string | null
  newId: () => string
  now: string
}

/** Markdown links to the apps (as exported) made links into the games again. */
function linksBack(body: string, gameLinkOf: ImportOptions['gameLinkOf']): string {
  return body.replace(
    /(?<!!)\[([^[\]\n]*)\]\(([^()\s]+)\)/g,
    (whole, text: string, url: string) => {
      const inner = gameLinkOf(url)
      const link = inner ? readLink(inner) : null
      if (!link || link.kind === 'page') return whole
      return formatLink({ ...link, ...(text.trim() ? { alias: text.trim() } : {}) })
    },
  )
}

/** The `.md` files of a folder (by path in it) as pages. Other files are left out. */
export function filesToPages(files: Record<string, string>, options: ImportOptions): NotePage[] {
  const pages: NotePage[] = []
  for (const [file, text] of Object.entries(files)) {
    const parts = file.replace(/\\/g, '/').split('/').filter(Boolean)
    if (!/\.md$/i.test(parts.at(-1) ?? '') || parts.some((p) => p.startsWith('.'))) continue
    let campaign = options.into || undefined
    if (parts.length > 1) {
      const of = options.campaignOfFolder(parts[0])
      if (of !== null) {
        campaign = of || undefined
        parts.shift()
      }
    }
    const path = cleanNotePath(parts.join('/'))
    if (!path) continue
    pages.push(
      newPage(
        options.newId(),
        path,
        campaign,
        options.now,
        linksBack(text.replace(/\r\n/g, '\n'), options.gameLinkOf),
      ),
    )
  }
  return pages
}

/**
 * Imported pages put among those there: one at the path of a page of the same campaign takes
 * its place (keeping its id, so `noteRef`s and links still reach it). Gives what to write and
 * how many were replaced.
 */
export function mergePages(
  existing: readonly NotePage[],
  imported: readonly NotePage[],
): { put: NotePage[]; replaced: number } {
  let replaced = 0
  const put = imported.map((page) => {
    const same = existing.find(
      (p) => (p.campaign ?? '') === (page.campaign ?? '') && pathKey(p.path) === pathKey(page.path),
    )
    if (!same) return page
    replaced++
    return { ...page, id: same.id, created: same.created }
  })
  return { put, replaced }
}
