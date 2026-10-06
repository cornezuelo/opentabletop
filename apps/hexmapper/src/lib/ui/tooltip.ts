/**
 * Styled tooltips (instead of the browser's native `title`). One floating element
 * shared by the whole app, positioned above the target (or below if there's no room).
 *
 *   <button use:tooltip={t('…')}>…</button>
 */
let bubble: HTMLDivElement | null = null

function ensureBubble(): HTMLDivElement {
  if (bubble) return bubble
  bubble = document.createElement('div')
  bubble.className = 'ot-tooltip'
  bubble.setAttribute('role', 'tooltip')
  document.body.appendChild(bubble)
  return bubble
}

function show(target: HTMLElement, text: string): void {
  if (!text) return
  const el = ensureBubble()
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
  const enter = () => show(node, current)
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
