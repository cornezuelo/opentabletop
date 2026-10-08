import { initialLocale } from '@open-tabletop/ui-kit'
import { en } from './en'
import { es } from './es'
import { translate } from './translate'
import type { MessageKey, Messages } from './types'

export const locales = { en: 'English', es: 'Español' } as const
export type Locale = keyof typeof locales

const dictionaries: Record<Locale, Messages> = { es, en }
/** Shared by every OpenTabletop app on the same site; the Hexmapper used its own key before. */
const STORAGE_KEY = 'opentabletop.locale'
const OLD_KEY = 'hexmapper.locale'

/** The user's choice, otherwise the browser's language if we have it, otherwise English. */
const state = $state({
  locale: initialLocale([STORAGE_KEY, OLD_KEY], Object.keys(locales) as Locale[], 'en'),
})

export function getLocale(): Locale {
  return state.locale
}

export function setLocale(locale: Locale): void {
  state.locale = locale
  document.documentElement.lang = locale
  try {
    localStorage.setItem(STORAGE_KEY, locale)
  } catch {
    // Not persisted; the choice still applies to this session.
  }
}

/** Reactive inside components: re-renders when the locale changes. */
export function t(key: MessageKey, params?: Record<string, string | number>): string {
  return translate(dictionaries[state.locale], key, params)
}

export type { MessageKey }
