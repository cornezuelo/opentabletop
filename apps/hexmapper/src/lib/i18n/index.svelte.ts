import { en } from './en'
import { es } from './es'
import { translate } from './translate'
import type { MessageKey, Messages } from './types'

export const locales = { en: 'English', es: 'Español' } as const
export type Locale = keyof typeof locales

const dictionaries: Record<Locale, Messages> = { es, en }
const STORAGE_KEY = 'hexmapper.locale'

function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && value in locales
}

function initialLocale(): Locale {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (isLocale(stored)) return stored
  } catch {
    // Storage unavailable: use the default.
  }
  return 'en'
}

const state = $state({ locale: initialLocale() })

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
