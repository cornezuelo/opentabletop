import { getProvider } from '@open-tabletop/note-refs'
import { appUrl } from '@open-tabletop/ui-kit'

/** A page's address inside Notes, by its id: `#/page/<id>`. */
export const pageHash = (id: string): string => `#/page/${encodeURIComponent(id)}`

/** Where Notes opens a page, from another app. */
export const notePageUrl = (id: string): string => `${appUrl('notes')}${pageHash(id)}`

/**
 * Where Notes opens the page a link names from `campaign`, or makes it (a page not written
 * yet), as the OpenTabletop Notes provider writes a `noteRef`'s address.
 */
export const noteRefUrl = (path: string, campaign?: string): string =>
  getProvider('opentabletop').url(path, {
    appUrl: appUrl('notes'),
    ...(campaign ? { campaign } : {}),
  }) ?? appUrl('notes')
