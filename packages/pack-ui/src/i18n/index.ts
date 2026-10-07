import { translate, type MessageKey } from '@open-tabletop/ui-kit'
import { en } from './en'
import { es } from './es'

export type PackUiKey = MessageKey<typeof en>

const dictionaries: Record<string, object> = { en, es }

/** The package's texts in the host's UI language (English when it has no dictionary). */
export const translator =
  (locale: () => string) =>
  (key: PackUiKey, params?: Record<string, string | number>): string =>
    translate(dictionaries[locale()] ?? en, key, params)
