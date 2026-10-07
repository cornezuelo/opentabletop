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

/**
 * Tells the user a new version of the app has been downloaded (the offline copy is
 * replaced) and reloads into it if they want; otherwise it takes over on the next visit.
 * Apps call it from their service worker registration (`onNeedRefresh`).
 */
export async function offerUpdate(reload: () => void): Promise<void> {
  const text = TEXT[document.documentElement.lang.slice(0, 2)] ?? TEXT.en
  const choice = await ask(text.title, text.message, [
    { value: 'later', label: text.later },
    { value: 'reload', label: text.reload, kind: 'primary' },
  ])
  if (choice === 'reload') reload()
}
