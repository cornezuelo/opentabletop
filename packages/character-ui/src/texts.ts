import { translator, type CharacterUiKey } from './i18n'
import type { SheetText } from '@open-tabletop/character-engine'

/** A sheet's text in a language: the text itself, or its translation (else English, else any). */
export function sheetText(text: SheetText | undefined, locale: string): string | undefined {
  if (text === undefined || typeof text === 'string') return text
  return text[locale] ?? text.en ?? Object.values(text)[0]
}

/** The package's name for a value or condition a sheet leaves unnamed (the generic one's). */
export function knownName(id: string, locale: string): string {
  const name = translator(() => locale)(`known.${id}` as CharacterUiKey)
  return name === `known.${id}` ? id.replaceAll('-', ' ') : name
}
