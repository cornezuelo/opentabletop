/**
 * The campaigns' journals in IndexedDB (docs/notes-and-journal.md §2), one entry per campaign
 * keyed by its id, apart from the campaign itself: a journal grows for months, and every map
 * reads the campaign. Their contents are journals in the format of `@open-tabletop/journal`
 * (`json`, versioned); backups copy them as they are. Every write is announced on
 * `opentabletop.journals`, so an app showing one reads it again.
 */
import { createLibrary } from './library'

/** The channel the journals' changes go out on. */
export const JOURNALS_CHANNEL = 'opentabletop.journals'

const journals = createLibrary('journals', JOURNALS_CHANNEL)

export const putJournalEntry = journals.put
export const getJournalEntry = journals.get
export const deleteJournal = journals.delete
/** All journals, without their JSON (for backups). */
export const listJournals = journals.list
/** Every journal with its JSON (for backups). */
export const allJournals = journals.all
/** Writes several journals and deletes others in one transaction (restoring a backup). */
export const updateJournals = journals.update
/** Calls `listener` whenever a journal changes, in this page or another window or app. */
export const onAnyJournalChange: typeof journals.onAnyChange = (listener) =>
  journals.onAnyChange(listener)

/** The change of each campaign's journal under way in this page, so the next waits for it. */
const changing = new Map<string, Promise<void>>()

/**
 * Changes a campaign's journal, read and written whole, one change at a time per campaign in
 * this page (a trip's moments copied in while a note is written don't undo each other).
 * `change` gets its JSON (undefined: it has none yet) and gives the new one, or undefined to
 * leave it as it is.
 */
export function changeJournalEntry(
  campaign: string,
  name: string,
  change: (json: string | undefined) => string | undefined,
): Promise<void> {
  const run = async () => {
    const entry = await journals.get(campaign)
    const json = change(entry?.json)
    if (json !== undefined)
      await journals.put({ id: campaign, name, modified: new Date().toISOString(), json })
  }
  const next = (changing.get(campaign) ?? Promise.resolve()).then(run)
  // A change that failed doesn't stop the next ones.
  changing.set(
    campaign,
    next.catch(() => undefined),
  )
  return next
}
