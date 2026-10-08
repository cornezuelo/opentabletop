/**
 * Contextual help: the explanation of one control, shown in the app's help column (above
 * its manual) instead of a tooltip. A label with help is underlined with dots; clicking it
 * opens the column on its explanation, and while the column is open, focusing its field
 * shows it too. Apps open their help column when help is asked for (`asked` changes), close
 * it when the reader closes the explanation (`closed` changes), and say whether it is
 * showing (`shown`).
 */
export interface HelpEntry {
  /** What it explains: the label's own text. */
  title: string
  /** Plain text (line breaks kept), or a pack's Markdown. */
  text?: string
  markdown?: string
}

class ContextHelp {
  entry = $state<HelpEntry | null>(null)
  /** Bumped each time help is asked for: apps open their help column then. */
  asked = $state(0)
  /** Bumped when the reader closes the explanation: apps close their help column then. */
  closed = $state(0)
  /** Whether the app's help column is open (set by the app). */
  shown = $state(false)
}

export const contextHelp = new ContextHelp()

/** Shows an explanation and asks the app to open its help column. */
export function askHelp(entry: HelpEntry): void {
  contextHelp.entry = entry
  contextHelp.asked++
}

/** Closes the explanation and asks the app to close its help column. */
export function closeHelp(): void {
  contextHelp.entry = null
  contextHelp.closed++
}

/** Shows an explanation only if the help column is already open (a field got focus). */
export function focusHelp(entry: HelpEntry): void {
  if (contextHelp.shown) contextHelp.entry = entry
}

const tidy = (text: string) => text.replace(/\s+/g, ' ').trim()
/** A label's own words: its text, not its field's (a select's options…). */
const words = (el: Element) =>
  tidy(
    [...el.childNodes]
      .filter((n) => n.nodeType === Node.TEXT_NODE)
      .map((n) => n.textContent)
      .join(' '),
  ) || tidy(el.textContent ?? '')

/**
 * Gives `anchor`'s parent (a label's text, a column header, a title) the help `content`:
 * dotted underline, click or Enter to ask for it, and focusing the field of its <label>
 * shows it while the help column is open. Returns the cleanup.
 */
export function attachHelp(
  anchor: HTMLElement,
  content: { text?: string; markdown?: string },
): () => void {
  const target = anchor.parentElement
  if (!target) return () => {}
  const entry = (): HelpEntry => ({ title: words(target), ...content })
  const label = target.closest('label')
  // A checkbox's label: clicking its text asks for help instead of ticking the box.
  const toggle = label?.querySelector('input[type="checkbox"], input[type="radio"]')
  const focusable = !label && target.tabIndex < 0
  target.classList.add('has-help')
  target.setAttribute('aria-description', content.text ?? content.markdown ?? '')
  if (focusable) target.tabIndex = 0

  const onclick = (event: MouseEvent) => {
    // The field itself (or the click a label passes on to it): only focus shows help.
    const control = (event.target as Element).closest('input, select, textarea, button, a')
    if (control && control !== target && target.contains(control)) return
    if (toggle) event.preventDefault()
    askHelp(entry())
  }
  const onkeydown = (event: KeyboardEvent) => {
    if (event.key !== 'Enter' && event.key !== ' ') return
    event.preventDefault()
    askHelp(entry())
  }
  const onfocus = () => focusHelp(entry())
  target.addEventListener('click', onclick)
  if (focusable) target.addEventListener('keydown', onkeydown)
  label?.addEventListener('focusin', onfocus)
  return () => {
    target.removeEventListener('click', onclick)
    target.removeEventListener('keydown', onkeydown)
    label?.removeEventListener('focusin', onfocus)
    target.classList.remove('has-help')
    target.removeAttribute('aria-description')
    if (focusable) target.removeAttribute('tabindex')
  }
}
