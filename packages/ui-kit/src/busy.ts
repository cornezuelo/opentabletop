/**
 * A button busy with something that takes a while (creating, opening, importing,
 * exporting): `use:busy={working}`. While on it can't be pressed again (its clicks are
 * stopped; its `disabled` is left to the page), shows a spinner in place of its label (kept
 * in the page, so it keeps its width and screen readers still read it, with `aria-busy`),
 * and goes back to how it was when done.
 */
export function busy(node: HTMLButtonElement, on: boolean) {
  let now = false
  const stop = (e: Event) => {
    if (!now) return
    e.preventDefault()
    e.stopImmediatePropagation()
  }
  node.addEventListener('click', stop, true)
  const set = (value: boolean) => {
    now = value
    if (value) node.setAttribute('aria-busy', 'true')
    else node.removeAttribute('aria-busy')
    node.classList.toggle('busy', value)
  }
  set(on)
  return {
    update: set,
    destroy: () => {
      set(false)
      node.removeEventListener('click', stop, true)
    },
  }
}

/**
 * Runs `task` with `state.busy` on until it's done, letting the page show it first (a
 * synchronous step after it would otherwise block the spinner from ever being drawn). Nothing
 * runs while it's already busy.
 */
export async function whileBusy<T>(
  state: { busy: boolean },
  task: () => Promise<T> | T,
): Promise<T | undefined> {
  if (state.busy) return undefined
  state.busy = true
  try {
    await new Promise((resolve) => setTimeout(resolve, 30))
    return await task()
  } finally {
    state.busy = false
  }
}
