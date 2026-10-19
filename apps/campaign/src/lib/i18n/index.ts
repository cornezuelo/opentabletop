import { createI18n, type MessageKey as Key } from '@open-tabletop/ui-kit'
import { en } from './en'
import { es } from './es'

export type MessageKey = Key<typeof en>

export const { t, getLocale, setLocale, locales } = createI18n<typeof en, 'en' | 'es'>({
  dictionaries: { en, es },
  names: { en: 'English', es: 'Español' },
  defaultLocale: 'en',
  storageKey: 'opentabletop.locale',
})
