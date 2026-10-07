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

/** "Later" is remembered for this browser session (one key for every app). */
const LATER_KEY = 'opentabletop.updateLater'

/**
 * Tells the user a new version of the app has been downloaded (the offline copy is
 * replaced) and reloads into it if they want; otherwise it takes over once every tab of
 * the app is closed. Apps call it from their service worker registration
 * (`onNeedRefresh`). After "Later" it doesn't ask again until the browser is reopened:
 * the waiting version would otherwise be offered on every reload and in every app.
 */
export async function offerUpdate(reload: () => void): Promise<void> {
  try {
    if (sessionStorage.getItem(LATER_KEY)) return
  } catch {
    // No session storage (private mode…): ask every time.
  }
  const text = TEXT[document.documentElement.lang.slice(0, 2)] ?? TEXT.en
  const choice = await ask(text.title, text.message, [
    { value: 'later', label: text.later },
    { value: 'reload', label: text.reload, kind: 'primary' },
  ])
  if (choice === 'reload') return reload()
  try {
    sessionStorage.setItem(LATER_KEY, '1')
  } catch {
    // Nothing to remember it in.
  }
}
