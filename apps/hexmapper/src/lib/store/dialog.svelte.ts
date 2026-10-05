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

/** The dialog currently shown, if any (rendered by Dialog.svelte). */
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
