import DOMPurify from 'dompurify'
import { marked } from 'marked'

// Links in notes open in a new tab so they never navigate away from the editor.
DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.tagName === 'A') {
    node.setAttribute('target', '_blank')
    node.setAttribute('rel', 'noopener noreferrer')
  }
})

/** Markdown to sanitized HTML. Notes may come from shared map files, so never skip sanitizing. */
export function renderMarkdown(source: string): string {
  const html = marked.parse(source, { async: false, gfm: true, breaks: true })
  return DOMPurify.sanitize(html)
}
