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

const manuals = import.meta.glob('../../../../docs/manual/*/notes/01-getting-started.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

const MARK = '<!-- markdown-summary -->'

/** What the manual's summary of Markdown says, its heading and links within the manual made plain. */
export function markdownSummary(manual: string): string {
  const from = manual.indexOf(MARK)
  const to = manual.indexOf('<!-- /markdown-summary -->')
  if (from < 0 || to < from) return ''
  return manual
    .slice(from + MARK.length, to)
    .replace(/\[([^\]]+)\]\((?:#|\.\.?\/)[^)]*\)/g, '$1')
    .trim()
}

const inLocale = (files: Record<string, string>, pattern: (l: string) => string, locale: string) =>
  Object.entries(files).find(([p]) => p.endsWith(pattern(locale)))?.[1] ??
  Object.entries(files).find(([p]) => p.endsWith(pattern('en')))?.[1] ??
  ''

/** The welcome page in `locale` (English where it has none): its title and text. */
export function welcomePage(locale: string): { title: string; body: string } {
  const page = inLocale(pages, (l) => `/welcome/${l}.md`, locale)
  const manual = inLocale(manuals, (l) => `/${l}/notes/01-getting-started.md`, locale)
  const title = /^#\s+(.+)$/m.exec(page)?.[1]?.trim() ?? 'Notes'
  const body = page.replace(MARK, markdownSummary(manual))
  return { title, body }
}
