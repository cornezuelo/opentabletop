import { tripTab } from './tripTab.svelte'

/**
 * Who a card shows in the Party tab (`showInParty`): asked for, the card and the folds around
 * it open, and it's scrolled to.
 */
export function revealed(node: HTMLElement, id: string) {
  let current = id
  const stop = $effect.root(() => {
    $effect(() => {
      const shown = tripTab.shown
      if (!shown || shown.id !== current) return
      for (let d: HTMLElement | null = node; d; d = d.parentElement)
        if (d instanceof HTMLDetailsElement) d.open = true
      node.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    })
  })
  return {
    update(next: string) {
      current = next
    },
    destroy: stop,
  }
}
