import { ask } from './dialog.svelte'

const TEXT: Record<string, { title: string; message: string; later: string; reload: string }> = {
  en: {
    title: 'A new version is ready',
    message:
      'OpenTabletop has been updated. Reload to use the new version (your maps, packs and trips are kept).',
    later: 'Later',
    reload: 'Reload now',
  },
  es: {
    title: 'Hay una versión nueva',
    message:
      'OpenTabletop se ha actualizado. Recarga para usar la versión nueva (tus mapas, packs y viajes se conservan).',
    later: 'Más tarde',
    reload: 'Recargar ahora',
  },
}

/** "Later" is remembered, for the version it was said to, in this tab (one key for every app). */
const LATER_KEY = 'opentabletop.updateLater'

/**
 * A fingerprint of the version waiting to take over: a hash of its service worker script,
 * which changes with every build (it lists every file's revision). Null when it can't be
 * told (no waiting worker, offline, no crypto), and then "Later" isn't remembered.
 */
async function waitingVersion(): Promise<string | null> {
  try {
    const registration = await navigator.serviceWorker.getRegistration()
    const url = registration?.waiting?.scriptURL
    if (!url) return null
    const script = await (await fetch(url, { cache: 'no-store' })).text()
    const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(script))
    return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join('')
  } catch {
    return null
  }
}

/**
 * Tells the user a new version of the app has been downloaded (the offline copy is
 * replaced) and reloads into it if they want; otherwise it takes over once every tab of
 * the app is closed. Apps call it from their service worker registration
 * (`onNeedRefresh`). After **Later** it doesn't ask again in this tab for that same
 * version, so reloading doesn't bring it back each time; a newer build asks again.
 * Closing the question without answering (Escape, clicking outside) isn't a "Later".
 */
export async function offerUpdate(reload: () => void): Promise<void> {
  const version = await waitingVersion()
  try {
    if (version && sessionStorage.getItem(LATER_KEY) === version) return
  } catch {
    // No session storage (private mode…): ask every time.
  }
  const text = TEXT[document.documentElement.lang.slice(0, 2)] ?? TEXT.en
  const choice = await ask(text.title, text.message, [
    { value: 'later', label: text.later },
    { value: 'reload', label: text.reload, kind: 'primary' },
  ])
  if (choice === 'reload') return reload()
  if (choice !== 'later' || !version) return
  try {
    sessionStorage.setItem(LATER_KEY, version)
  } catch {
    // Nothing to remember it in.
  }
}
