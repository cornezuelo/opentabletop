/**
 * Moves an element to the end of the page's body while it's shown, so it covers everything:
 * an overlay drawn inside a panel would otherwise stay within that panel's layer, under what
 * sits above it (a button to hide the panel).
 */
export function portal(node: HTMLElement): { destroy: () => void } {
  document.body.appendChild(node)
  return { destroy: () => node.remove() }
}
