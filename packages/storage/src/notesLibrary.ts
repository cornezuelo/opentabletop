/**
 * Notes' pages in IndexedDB (docs/notes-and-journal.md §3), one entry per page keyed by its
 * id: `name` is its path, `parent` its campaign (absent: General). Their contents are pages
 * in the format of `@open-tabletop/notes` (`json`, versioned); backups copy them as they
 * are. Every write is announced on `opentabletop.notes`, so an app showing them reads again.
 */
import { createLibrary } from './library'

/** The channel the pages' changes go out on. */
export const NOTES_CHANNEL = 'opentabletop.notes'

const notes = createLibrary('notes', NOTES_CHANNEL)

export const putNoteEntry = notes.put
export const getNoteEntry = notes.get
export const deleteNoteEntry = notes.delete
/** All pages, without their JSON. */
export const listNotes = notes.list
/** Every page with its JSON (search, backlinks, backups). */
export const allNotes = notes.all
/** Writes several pages and deletes others in one transaction (an import, a rename, a restore). */
export const updateNotes = notes.update
/** Calls `listener` whenever a page changes in another window or app. */
export const onNotesChange: typeof notes.onChange = (listener) => notes.onChange(listener)
/** Calls `listener` whenever a page changes, here or in another window or app. */
export const onAnyNoteChange: typeof notes.onAnyChange = (listener) => notes.onAnyChange(listener)

/**
 * A deleted campaign's pages kept in General, under a folder by its name (`Vale/npcs/Old
 * Tobin`): lore is never lost with a campaign, which Map may delete by itself. Touches only
 * the page's `campaign` and `path`, the two fields every version of the format has.
 */
export async function moveCampaignNotes(campaign: string, folder: string): Promise<void> {
  const pages = (await notes.all()).filter((entry) => entry.parent === campaign)
  if (!pages.length) return
  const modified = new Date().toISOString()
  const name = folder.replace(/[/\\]/g, '-').trim() || campaign
  const moved = pages.map((entry) => {
    let page: Record<string, unknown>
    try {
      page = JSON.parse(entry.json) as Record<string, unknown>
    } catch {
      return { ...entry, parent: undefined, modified }
    }
    const path = `${name}/${String(page.path ?? entry.name)}`
    const moved: Record<string, unknown> = { ...page, path, modified }
    delete moved.campaign
    return { id: entry.id, name: path, modified, json: JSON.stringify(moved) }
  })
  await notes.update(moved)
}
