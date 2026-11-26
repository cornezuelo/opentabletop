/**
 * A page of Notes (docs/notes-and-journal.md §3, §9): Markdown kept in this browser, in a
 * campaign or in **General** (none), at a path of folders (`npcs/Old Tobin`) whose last
 * part is its title. Pages hold lore; the games hold mechanics and point at pages
 * (`noteRef`), and pages point back at them (`[[character:kael]]`).
 */

/** v1: a page's path, campaign and Markdown. */
export const NOTES_FORMAT = 1

export interface NotePage {
  id: string
  /** The campaign it belongs to; absent: General, shared by every campaign. */
  campaign?: string
  /** Folders and title, `/` between them, as written (`npcs/Old Tobin`). */
  path: string
  /** Markdown. */
  body: string
  /** Real times, ISO. */
  created: string
  modified: string
}

/**
 * A path as Notes keeps it: parts trimmed, empty ones and a `.md` ending dropped, so paths
 * copied from SilverBullet or Obsidian (`/npcs/Old Tobin.md`) work.
 */
export function cleanNotePath(path: string): string {
  return path
    .trim()
    .replace(/\.md$/i, '')
    .split('/')
    .map((part) => part.trim())
    .filter(Boolean)
    .join('/')
}

/** A path as compared: clean and case-blind (`NPCs/old tobin` is `npcs/Old Tobin`). */
export const pathKey = (path: string): string => cleanNotePath(path).toLocaleLowerCase()

/** A page's title: the last part of its path. */
export const pageTitle = (page: Pick<NotePage, 'path'>): string =>
  cleanNotePath(page.path).split('/').pop() ?? ''

/** A page's folders (`npcs`, `places/towns`); '' at the top. */
export const pageFolder = (page: Pick<NotePage, 'path'>): string =>
  cleanNotePath(page.path).split('/').slice(0, -1).join('/')

export function newPage(
  id: string,
  path: string,
  campaign: string | undefined,
  now: string,
  body = '',
): NotePage {
  return {
    id,
    ...(campaign ? { campaign } : {}),
    path: cleanNotePath(path),
    body,
    created: now,
    modified: now,
  }
}

/** A page as stored (storage's `notes`), versioned. */
export function pageJson(page: NotePage): string {
  return JSON.stringify({ format: NOTES_FORMAT, ...page })
}

/** A stored page, or null if it isn't one (or comes from a newer version). */
export function readPageJson(json: string): NotePage | null {
  try {
    const raw = JSON.parse(json) as Record<string, unknown>
    if (typeof raw?.format !== 'number' || raw.format > NOTES_FORMAT) return null
    const { id, campaign, path, body, created, modified } = raw
    if (typeof id !== 'string' || !id || typeof path !== 'string' || typeof body !== 'string')
      return null
    return {
      id,
      ...(typeof campaign === 'string' && campaign ? { campaign } : {}),
      path: cleanNotePath(path),
      body,
      created: typeof created === 'string' ? created : '',
      modified: typeof modified === 'string' ? modified : '',
    }
  } catch {
    return null
  }
}
