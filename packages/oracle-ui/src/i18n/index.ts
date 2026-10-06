import { translate, type MessageKey } from '@open-tabletop/ui-kit'
import { en } from './en'
import { es } from './es'

export type OracleUiKey = MessageKey<typeof en>
export type Translate = (key: OracleUiKey, params?: Record<string, string | number>) => string

const dictionaries: Record<string, object> = { en, es }

/** The package's own texts in the host's UI language (English when it has no dictionary). */
export const translator =
  (locale: () => string): Translate =>
  (key, params) =>
    translate(dictionaries[locale()] ?? en, key, params)
