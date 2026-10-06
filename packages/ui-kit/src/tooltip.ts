/**
 * Styled tooltips (instead of the browser's native `title`). One floating element
 * shared by the whole app, positioned above the target (or below if there's no room).
 * Inside an open modal dialog it moves into the dialog (the top layer).
 *
 *   <button use:tooltip={t('…')}>…</button>
 */
let bubble: HTMLDivElement | null = null

const STYLE = `
.ot-tooltip {
  position: fixed; z-index: 1000; max-width: 280px; padding: 7px 10px;
  font-size: 12px; line-height: 1.45; color: var(--text); pointer-events: none;
  background: var(--panel); border: 1px solid var(--accent); border-radius: 6px;
  box-shadow: 0 6px 18px rgb(0 0 0 / 0.45);
  opacity: 0; transform: translateY(2px); transition: opacity 0.12s, transform 0.12s;
}
.ot-tooltip[data-visible='true'] { opacity: 1; transform: none; }
`

function ensureBubble(): HTMLDivElement {
  if (bubble) return bubble
  const style = document.createElement('style')
  style.textContent = STYLE
  document.head.appendChild(style)
  bubble = document.createElement('div')
  bubble.className = 'ot-tooltip'
  bubble.setAttribute('role', 'tooltip')
  document.body.appendChild(bubble)
  return bubble
}

/** Shows the tooltip next to `target` right away (e.g. when an info badge is tapped). */
export function showTooltip(target: HTMLElement, text: string): void {
  if (!text) return
  const el = ensureBubble()
  // Modal dialogs live in the browser's top layer, above any z-index: follow the target
  // into its dialog so the tooltip isn't hidden behind it.
  const host = target.closest('dialog[open]') ?? document.body
  if (el.parentElement !== host) host.appendChild(el)
  el.textContent = text
  el.dataset.visible = 'true'
  const rect = target.getBoundingClientRect()
  const box = el.getBoundingClientRect()
  const margin = 8
  const left = Math.min(
    window.innerWidth - box.width - margin,
    Math.max(margin, rect.left + rect.width / 2 - box.width / 2),
  )
  const above = rect.top - box.height - 6
  const top = above >= margin ? above : rect.bottom + 6
  el.style.left = `${left}px`
  el.style.top = `${top}px`
}

function hide(): void {
  if (bubble) bubble.dataset.visible = 'false'
}

export function tooltip(node: HTMLElement, text: string | undefined) {
  let current = text ?? ''
  const enter = () => showTooltip(node, current)
  node.addEventListener('mouseenter', enter)
  node.addEventListener('focus', enter)
  node.addEventListener('mouseleave', hide)
  node.addEventListener('blur', hide)
  node.addEventListener('click', hide)
  return {
    update(next: string | undefined) {
      current = next ?? ''
    },
    destroy() {
      node.removeEventListener('mouseenter', enter)
      node.removeEventListener('focus', enter)
      node.removeEventListener('mouseleave', hide)
      node.removeEventListener('blur', hide)
      node.removeEventListener('click', hide)
      hide()
    },
  }
}
