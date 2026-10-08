/**
 * Tiny typed i18n: one reference dictionary (its shape defines the keys) plus
 * translations of the same shape. The active locale is a user preference in
 * localStorage; without one, the browser's language if we have it, else the default.
 */
import { initialLocale } from './locale.mjs'

type Widen<T> = { -readonly [K in keyof T]: T[K] extends string ? string : Widen<T[K]> }
type Paths<T, P extends string = ''> = {
  [K in keyof T & string]: T[K] extends string ? `${P}${K}` : Paths<T[K], `${P}${K}.`>
}[keyof T & string]

export type Messages<Ref> = Widen<Ref>
export type MessageKey<Ref> = Paths<Widen<Ref>>

export function translate(
  messages: object,
  key: string,
  params?: Record<string, string | number>,
): string {
  let node: unknown = messages
  for (const part of key.split('.')) node = (node as Record<string, unknown>)?.[part]
  if (typeof node !== 'string') return key
  if (!params) return node
  return node.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in params ? String(params[name]) : match,
  )
}

export function createI18n<Ref extends object, L extends string>(options: {
  dictionaries: Record<L, Messages<Ref>>
  names: Record<L, string>
  defaultLocale: L
  storageKey: string
}) {
  const initial = initialLocale(
    [options.storageKey],
    Object.keys(options.dictionaries) as L[],
    options.defaultLocale,
  )
  const state = $state({ locale: initial })
  return {
    locales: options.names,
    getLocale: (): L => state.locale,
    setLocale(locale: L) {
      state.locale = locale
      document.documentElement.lang = locale
      try {
        localStorage.setItem(options.storageKey, locale)
      } catch {
        // Not persisted.
      }
    },
    t: (key: MessageKey<Ref>, params?: Record<string, string | number>): string =>
      translate(options.dictionaries[state.locale], key, params),
  }
}
