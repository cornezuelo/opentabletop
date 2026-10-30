export interface Toast {
  id: number
  message: string
  kind: 'info' | 'error'
}

let nextId = 0

export const toasts = $state<Toast[]>([])

export function showToast(
  message: string,
  kind: Toast['kind'] = 'info',
  ms = 4000,
): /** Takes it away before its time (one that says something is under way, once it's done). */
() => void {
  const id = nextId++
  toasts.push({ id, message, kind })
  const dismiss = () => {
    const index = toasts.findIndex((t) => t.id === id)
    if (index >= 0) toasts.splice(index, 1)
  }
  setTimeout(dismiss, ms)
  return dismiss
}
