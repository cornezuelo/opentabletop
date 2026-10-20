import DOMPurify from 'dompurify'
import { marked } from 'marked'
import { anchorOf } from './pages'

/**
 * Manual Markdown to sanitized HTML. `##` and `###` headings get anchor ids (search results scroll
 * to them); links to other pages (`tokens.md`, `../oracle/rolling.md#decks`) keep their
 * href so the views can turn clicks into navigation. Pictures (`![…](hex-flower.svg)`) take
 * the URL `picture` gives their written path, if any.
 */
export function renderPage(
  markdown: string,
  picture?: (src: string) => string | undefined,
): string {
  const html = marked.parse(markdown, { async: false, gfm: true })
  const clean = withPictures(DOMPurify.sanitize(html), picture)
  return clean.replace(/<h([23])>(.*?)<\/h\1>/g, (_, level: string, inner: string) => {
    const text = inner.replace(/<[^>]+>/g, '')
    return `<h${level} id="${anchorOf(text)}">${inner}</h${level}>`
  })
}

/** A link to another manual page: { app?, slug, anchor? } (app absent = same app). */
export function pageLink(href: string): { app?: string; slug: string; anchor?: string } | null {
  const m = /^(?:\.\.\/([\w-]+)\/)?(?:\d+-)?([\w-]+)\.md(?:#([\w-]+))?$/.exec(href)
  if (!m) return null
  return { app: m[1], slug: m[2], anchor: m[3] }
}

/** HTML with each picture's written path (`<img src="hex-flower.svg"`) turned into its URL. */
export function withPictures(html: string, picture?: (src: string) => string | undefined): string {
  return html.replace(/<img src="([^"]+)"/g, (whole, src: string) => {
    const url = picture?.(src)
    return url ? `<img src="${url}"` : whole
  })
}

/**
 * A picture a page shows, by its path from docs/manual/ (`en/systems/hex-flower.svg`): written
 * beside the page, or elsewhere by a relative path (`../images/x.svg`); a translation without
 * its own uses the English one.
 */
export function picturePath(
  page: { locale: string; app: string },
  src: string,
  exists: (path: string) => boolean,
): string | undefined {
  if (/^[a-z]+:|^\//i.test(src)) return undefined
  const resolve = (locale: string) => {
    const parts = [locale, page.app]
    for (const part of src.split('/'))
      if (part === '..') parts.pop()
      else if (part !== '.') parts.push(part)
    return parts.join('/')
  }
  return [resolve(page.locale), resolve('en')].find(exists)
}
