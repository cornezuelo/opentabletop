import type { SheetText } from '@open-tabletop/character-engine'

/** A sheet's text in a language: the text itself, or its translation (else English, else any). */
export function sheetText(text: SheetText | undefined, locale: string): string | undefined {
  if (text === undefined || typeof text === 'string') return text
  return text[locale] ?? text.en ?? Object.values(text)[0]
}

/** A value or condition a sheet leaves unnamed: its id made readable (`saddle-sore`: saddle sore). */
export const idName = (id: string): string => id.replaceAll('-', ' ')
