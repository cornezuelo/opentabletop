import { translate, type MessageKey } from '@open-tabletop/ui-kit'
import { en } from './en'
import { es } from './es'

export type CampaignUiKey = MessageKey<typeof en>
export type Translate = (key: CampaignUiKey, params?: Record<string, string | number>) => string

/** The package's dictionaries, for apps that say the same thing elsewhere (reuse, never copy). */
export const campaignTexts = { en, es }

const dictionaries: Record<string, object> = campaignTexts

/** The package's texts in the host's UI language (English when it has no dictionary). */
export const translator =
  (locale: () => string): Translate =>
  (key, params) =>
    translate(dictionaries[locale()] ?? en, key, params)
