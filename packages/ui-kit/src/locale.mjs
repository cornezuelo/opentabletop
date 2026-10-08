// How every OpenTabletop page picks its language: the one the user chose (shared by every
// app on the site, `opentabletop.locale`), otherwise the first of the browser's languages
// we have (es-ES, es-MX… → es), otherwise the default (English). Plain JS, so the landing
// page built by scripts/build-site.mjs inlines these same functions.

/** The language to use, from what was stored and the browser's languages. */
export function pickLocale(stored, languages, available, fallback) {
  if (typeof stored === 'string' && available.includes(stored)) return stored
  for (const language of languages ?? []) {
    const base = String(language).toLowerCase().split('-')[0]
    if (available.includes(base)) return base
  }
  return fallback
}

/** The language a page starts in: the first stored key that holds one, or the browser's. */
export function initialLocale(keys, available, fallback) {
  let stored = null
  try {
    for (const key of keys) {
      const value = localStorage.getItem(key)
      if (value && available.includes(value)) {
        stored = value
        break
      }
    }
  } catch {
    // Storage unavailable: the browser's language still applies.
  }
  const languages =
    typeof navigator === 'undefined' ? [] : (navigator.languages ?? [navigator.language])
  return pickLocale(stored, languages, available, fallback)
}
