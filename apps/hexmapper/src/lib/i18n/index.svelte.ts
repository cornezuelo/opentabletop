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

function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && value in locales
}

function initialLocale(): Locale {
  try {
    const stored = localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem(OLD_KEY)
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
