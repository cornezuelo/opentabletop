export interface DialogButton<T extends string> {
  value: T
  label: string
  kind?: 'primary' | 'danger'
}

interface DialogRequest {
  title: string
  message: string
  buttons: DialogButton<string>[]
  resolve: (value: string | null) => void
}

/** The dialog currently shown, if any (rendered by Dialogs.svelte, mounted once per app). */
export const dialog = $state<{ current: DialogRequest | null }>({ current: null })

/**
 * Asks the user to pick one of several buttons. Resolves with the chosen value, or
 * null if dismissed (Escape or clicking outside).
 */
export function ask<T extends string>(
  title: string,
  message: string,
  buttons: DialogButton<T>[],
): Promise<T | null> {
  dialog.current?.resolve(null)
  return new Promise((resolve) => {
    dialog.current = {
      title,
      message,
      buttons,
      resolve: (value) => {
        dialog.current = null
        resolve(value as T | null)
      },
    }
  })
}

/** Built-in button labels, by the page's language (`<html lang>`), English otherwise. */
const LABELS: Record<string, { cancel: string; confirm: string; title: string }> = {
  en: { cancel: 'Cancel', confirm: 'Continue', title: 'Are you sure?' },
  es: { cancel: 'Cancelar', confirm: 'Continuar', title: '¿Seguro?' },
}

/**
 * The app's own "are you sure?" (instead of the browser's confirm()). Resolves true
 * when confirmed; Escape, clicking outside or Cancel resolve false.
 */
export async function confirmAction(
  message: string,
  options: { title?: string; confirm?: string; danger?: boolean } = {},
): Promise<boolean> {
  const lang = typeof document === 'undefined' ? 'en' : document.documentElement.lang
  const labels = LABELS[lang.slice(0, 2)] ?? LABELS.en
  const choice = await ask(options.title ?? labels.title, message, [
    { value: 'cancel', label: labels.cancel },
    {
      value: 'ok',
      label: options.confirm ?? labels.confirm,
      kind: options.danger === false ? 'primary' : 'danger',
    },
  ])
  return choice === 'ok'
}
