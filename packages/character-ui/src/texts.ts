import type { SheetText } from '@open-tabletop/character-engine'

/** A sheet's text in a language: the text itself, or its translation (else English, else any). */
export function sheetText(text: SheetText | undefined, locale: string): string | undefined {
  if (text === undefined || typeof text === 'string') return text
  return text[locale] ?? text.en ?? Object.values(text)[0]
}

/** A value or condition a sheet leaves unnamed: its id made readable (`saddle-sore`: saddle sore). */
export const idName = (id: string): string => id.replaceAll('-', ' ')

/**
 * Someone's initial, for a face with no picture: the first letter of their name, a number at
 * its end kept (`Bandit 2` → `B2`); `?` for no name.
 */
export function initialsOf(name: string): string {
  const first = [...name.trim()].find((c) => /\p{L}|\p{N}/u.test(c)) ?? '?'
  const number = /(\d+)\s*$/.exec(name.trim())?.[1] ?? ''
  return first.toLocaleUpperCase() + (number && number !== first ? number : '')
}

/** An item's name: its own (by hand, or renamed), its catalogue's, or its id made readable. */
export function itemName(
  item: { id: string; name?: string; from?: string },
  catalogues: readonly { id: string; def: { items: Record<string, { name?: SheetText }> } }[],
  locale: string,
): string {
  if (item.name) return item.name
  const catalogue =
    catalogues.find((c) => c.id === item.from) ?? catalogues.find((c) => item.id in c.def.items)
  return sheetText(catalogue?.def.items[item.id]?.name, locale) ?? idName(item.id)
}

/** An id for an item written by hand, from its name (`Old rope` → `old-rope`). */
export function itemId(name: string): string {
  const id = name
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  // `tags` reads every item's tags: never an item's id.
  return !id ? 'item' : id === 'tags' ? 'tags-item' : id
}
