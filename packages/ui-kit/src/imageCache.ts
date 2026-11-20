/**
 * Pictures of the image library by id, read once and kept while the page lives (a fight's
 * faces show the same few many times); one changed or deleted is read again.
 */
import { getImage, onAnyImageChange, type LibraryImage } from '@open-tabletop/storage'

const read = new Map<string, Promise<LibraryImage | null>>()
const listeners = new Set<(id: string) => void>()
let stop: (() => void) | undefined

/** A picture of the library (null if there's none by that id, or it can't be read). */
export function cachedImage(id: string): Promise<LibraryImage | null> {
  let found = read.get(id)
  if (!found) {
    found = getImage(id).catch(() => null)
    read.set(id, found)
  }
  return found
}

/**
 * Calls `listener` with the id of a picture changed (here or in another app), after forgetting
 * it, so reading it again gets the new one. Returns a function that stops listening.
 */
export function onPictureChange(listener: (id: string) => void): () => void {
  listeners.add(listener)
  stop ??= onAnyImageChange((change) => {
    const ids = change.type === 'many' ? [...read.keys()] : [change.id]
    if (change.type === 'many') read.clear()
    else read.delete(change.id)
    for (const id of ids) for (const l of listeners) l(id)
  })
  return () => {
    listeners.delete(listener)
    if (!listeners.size) {
      stop?.()
      stop = undefined
    }
  }
}
