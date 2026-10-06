import DOMPurify from 'dompurify'
import { marked } from 'marked'
import { anchorOf } from './pages'

/**
 * Manual Markdown to sanitized HTML. `## headings` get anchor ids (search results scroll
 * to them); links to other pages (`tokens.md`, `../oracle/rolling.md#decks`) keep their
 * href so the views can turn clicks into navigation.
 */
export function renderPage(markdown: string): string {
  const html = marked.parse(markdown, { async: false, gfm: true })
  const clean = DOMPurify.sanitize(html)
  return clean.replace(/<h2>(.*?)<\/h2>/g, (_, inner: string) => {
    const text = inner.replace(/<[^>]+>/g, '')
    return `<h2 id="${anchorOf(text)}">${inner}</h2>`
  })
}

/** A link to another manual page: { app?, slug, anchor? } (app absent = same app). */
export function pageLink(href: string): { app?: string; slug: string; anchor?: string } | null {
  const m = /^(?:\.\.\/([\w-]+)\/)?(?:\d+-)?([\w-]+)\.md(?:#([\w-]+))?$/.exec(href)
  if (!m) return null
  return { app: m[1], slug: m[2], anchor: m[3] }
}
