import { markdownSummary, SUMMARY_MARK } from '@open-tabletop/notes-ui'

/**
 * The page Notes writes in General the first time it has no pages: what Notes is for and a
 * cheat sheet, in the UI's language. Its summary of Markdown is the manual's own
 * (`<!-- markdown-summary -->` in Notes' Getting started), never a second copy.
 */
const pages = import.meta.glob('../welcome/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

const inLocale = (files: Record<string, string>, pattern: (l: string) => string, locale: string) =>
  Object.entries(files).find(([p]) => p.endsWith(pattern(locale)))?.[1] ??
  Object.entries(files).find(([p]) => p.endsWith(pattern('en')))?.[1] ??
  ''

/** The welcome page in `locale` (English where it has none): its title and text. */
export function welcomePage(locale: string): { title: string; body: string } {
  const page = inLocale(pages, (l) => `/welcome/${l}.md`, locale)
  const title = /^#\s+(.+)$/m.exec(page)?.[1]?.trim() ?? 'Notes'
  const body = page.replace(SUMMARY_MARK, markdownSummary(locale))
  return { title, body }
}
