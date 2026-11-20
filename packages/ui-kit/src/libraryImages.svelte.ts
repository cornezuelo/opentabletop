/**
 * The image library's pictures added for one use (`icon`, `portrait`…), with their data, kept
 * up to date while the page lives: read on the first look, read again whenever one changes,
 * here or in another app. For pickers that offer the library's pictures beside their own
 * (Map's icons and terrain glyphs).
 */
import { allImages, onAnyImageChange, readImage, type LibraryImage } from '@open-tabletop/storage'

const lists: Record<string, { list: LibraryImage[] }> = {}
let listening = false

async function read(): Promise<void> {
  let images: LibraryImage[]
  try {
    images = (await allImages()).flatMap((e) => readImage(e) ?? [])
  } catch {
    return // No library here (a test, a blocked database): the lists stay as they are.
  }
  images.sort((a, b) => a.name.localeCompare(b.name))
  for (const [use, holder] of Object.entries(lists))
    holder.list = images.filter((i) => i.use === use)
}

/** The library's pictures added for `use`, by name; empty until they're read. */
export function libraryImages(use: string): readonly LibraryImage[] {
  let holder = lists[use]
  if (!holder) {
    const fresh = $state({ list: [] as LibraryImage[] })
    holder = fresh
    lists[use] = holder
    if (!listening) {
      listening = true
      onAnyImageChange(() => void read())
    }
    void read()
  }
  return holder.list
}
