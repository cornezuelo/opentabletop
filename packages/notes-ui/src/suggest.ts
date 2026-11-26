import { findPage, pageFolder, pageHeadings, pageTitle, type NotePage } from '@open-tabletop/notes'
import type { GameIndex } from './game'
import type { Translate } from './i18n'

/** One suggestion for a link being written: what it shows and what goes inside `[[ ]]`. */
export interface LinkOption {
  label: string
  /** Where it is, what it is. */
  detail: string
  insert: string
  kind: 'page' | 'heading' | 'character' | 'map' | 'campaign' | 'faction'
}

export interface SuggestTexts {
  /** The kinds' names, in the UI's language. */
  kinds: Record<'character' | 'map' | 'campaign' | 'faction' | 'heading', string>
  general: string
}

/** The suggestions' texts in the language of notes-ui's `t`. */
export const suggestTexts = (t: Translate): SuggestTexts => ({
  kinds: {
    character: t('kinds.character'),
    map: t('kinds.map'),
    campaign: t('kinds.campaign'),
    faction: t('kinds.faction'),
    heading: t('kinds.heading'),
  },
  general: t('general'),
})

/**
 * What a link begun at the cursor (`[[Old T`, `[[Old Tobin#Se`) may become, seen from a page
 * of `campaign`: pages it reaches (its campaign's, then General's), the headings of the page
 * named before `#`, and the games' things. `typed` is what's after `[[`. Null when the text
 * before the cursor isn't inside a link.
 */
export function linkOptions(
  before: string,
  pages: readonly NotePage[],
  index: GameIndex,
  campaign: string | undefined,
  texts: SuggestTexts,
): { typed: string; options: LinkOption[] } | null {
  const open = /\[\[([^[\]|\n]*)$/.exec(before)
  if (!open) return null
  const typed = open[1]
  const hash = typed.indexOf('#')
  if (hash >= 0 && !/^[a-z]+:/.test(typed)) {
    const target = typed.slice(0, hash)
    const page = target ? findPage(pages, target, campaign) : undefined
    if (!page) return { typed, options: [] }
    return {
      typed,
      options: pageHeadings(page.body).map((h) => ({
        label: h,
        detail: texts.kinds.heading,
        insert: `${target}#${h}`,
        kind: 'heading' as const,
      })),
    }
  }
  const reachable = pages.filter((p) => !p.campaign || p.campaign === campaign)
  const where = (p: NotePage) =>
    [p.campaign ? (index.campaigns[p.campaign] ?? p.campaign) : texts.general, pageFolder(p)]
      .filter(Boolean)
      .join(' / ')
  const pageOptions: LinkOption[] = reachable
    .sort((a, b) => (a.campaign ? 0 : 1) - (b.campaign ? 0 : 1) || a.path.localeCompare(b.path))
    .map((p) => {
      // A title that reaches another page from here is written as its whole path.
      const title = pageTitle(p)
      const insert = findPage(pages, title, campaign)?.id === p.id ? title : p.path
      return { label: title, detail: where(p), insert, kind: 'page' as const }
    })
  const things: LinkOption[] = index.things
    .filter((t) => !t.only && (!t.campaign || !campaign || t.campaign === campaign))
    .map((t) => ({
      label: t.name,
      detail: [texts.kinds[t.kind], t.where].filter(Boolean).join(' · '),
      insert: t.link,
      kind: t.kind,
    }))
  return { typed, options: [...pageOptions, ...things] }
}
