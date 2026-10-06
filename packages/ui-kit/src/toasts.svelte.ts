export interface Toast {
  id: number
  message: string
  kind: 'info' | 'error'
}

let nextId = 0

export const toasts = $state<Toast[]>([])

export function showToast(message: string, kind: Toast['kind'] = 'info', ms = 4000): void {
  const id = nextId++
  toasts.push({ id, message, kind })
  setTimeout(() => {
    const index = toasts.findIndex((t) => t.id === id)
    if (index >= 0) toasts.splice(index, 1)
  }, ms)
}
