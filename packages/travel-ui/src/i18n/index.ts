import { translate, type MessageKey } from '@open-tabletop/ui-kit'
import { en } from './en'
import { es } from './es'

export type TravelUiKey = MessageKey<typeof en>
export type Translate = (key: TravelUiKey, params?: Record<string, string | number>) => string

const dictionaries: Record<string, object> = { en, es }

/** The package's texts in the host's UI language (English when it has no dictionary). */
export const translator =
  (locale: () => string): Translate =>
  (key, params) =>
    translate(dictionaries[locale()] ?? en, key, params)

/**
 * A text for an id that packs choose (travel mode, resource, check event): the
 * dictionary's when there is one, otherwise the id made readable.
 */
export function idText(t: Translate, key: string, id: string): string {
  const text = t(key as TravelUiKey)
  return text === key ? id.replaceAll('-', ' ').replaceAll('_', ' ') : text
}
