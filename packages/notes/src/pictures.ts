/**
 * Pictures in a page: images of the browser's image library, written as a reference to it,
 * never the image itself, `![caption](picture:<id>)`. Exported as files beside the pages
 * (`![caption](../pictures/<name>.webp)`) and read back as references.
 */

/** The scheme of a reference to the image library in a page's Markdown. */
export const PICTURE_SCHEME = 'picture:'

/** A Markdown image, its caption and address (not inside an inline code span). */
const IMAGE = /!\[([^[\]\n]*)\]\(\s*<?([^()\s<>]+)>?(?:\s+"[^"\n]*")?\s*\)/g

/** The line that shows a picture of the library, with its caption. */
export function pictureMarkdown(id: string, caption = ''): string {
  return `![${caption.replace(/[[\]\n]/g, ' ').trim()}](${PICTURE_SCHEME}${id})`
}

/** The id a Markdown image's address names in the library, or null if it isn't one. */
export function pictureId(href: string): string | null {
  if (!href.startsWith(PICTURE_SCHEME)) return null
  const id = href.slice(PICTURE_SCHEME.length).trim()
  return id || null
}

/** The library pictures a text shows, once each, in order. */
export function picturesIn(text: string): string[] {
  const found = new Set<string>()
  for (const m of text.matchAll(IMAGE)) {
    const id = pictureId(m[2])
    if (id) found.add(id)
  }
  return [...found]
}

/** A text with each Markdown image's address rewritten (`null` leaves it as it is). */
export function rewritePictures(
  text: string,
  rewrite: (href: string, caption: string) => string | null,
): string {
  return text.replace(IMAGE, (whole, caption: string, href: string) => {
    const next = rewrite(href, caption)
    return next === null ? whole : `![${caption}](${next})`
  })
}

/** The folder of an export where the pages' pictures go. */
export const PICTURES_FOLDER = 'pictures'

/** `to` (a path from the export's root) as seen from the file at `from`. */
export function relativePath(from: string, to: string): string {
  const depth = from.split('/').length - 1
  return '../'.repeat(depth) + to
}

/** A relative address (`../pictures/a.webp`) read from the file at `from`, as a root path. */
export function resolvePath(from: string, href: string): string {
  const parts = from.split('/').slice(0, -1)
  for (const part of decodeURI(href).split('/')) {
    if (part === '..') parts.pop()
    else if (part && part !== '.') parts.push(part)
  }
  return parts.join('/')
}
