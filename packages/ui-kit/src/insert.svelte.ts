/**
 * Where an example clicked in the help column goes: the last text field or editor that had
 * focus. Plain inputs and textareas work by themselves; an editor that isn't one (the YAML
 * editor) registers how to insert with `registerInserter`. Fields inside an element marked
 * `data-no-insert` (search boxes, the help column itself) are never targets.
 */
export interface InsertTarget {
  /** What the field is called, for "Insert into …". */
  label: string
  insert(text: string): void
  /** Still on the page. */
  connected(): boolean
}

// Only read when a field gets focus: nothing renders from it.
// eslint-disable-next-line svelte/prefer-svelte-reactivity
const inserters = new Map<HTMLElement, (text: string) => void>()

class Inserting {
  target = $state.raw<InsertTarget | null>(null)
}

export const inserting = new Inserting()

/** The field the help column would insert into, if it is still on the page. */
export function insertTarget(): InsertTarget | null {
  const target = inserting.target
  return target?.connected() ? target : null
}

/** Inserts text where the last focused field's cursor was; false if there's none. */
export function insertText(text: string): boolean {
  const target = insertTarget()
  if (!target) return false
  target.insert(text)
  return true
}

/** An editor that isn't a plain field (e.g. CodeMirror) says how text goes in. */
export function registerInserter(root: HTMLElement, insert: (text: string) => void): () => void {
  inserters.set(root, insert)
  return () => {
    inserters.delete(root)
    if (inserting.target && !inserting.target.connected()) inserting.target = null
  }
}

const tidy = (text: string | null | undefined) => (text ?? '').replace(/\s+/g, ' ').trim()

/** A field's name: `data-field-label`, its aria-label, or its <label>'s text. */
export function fieldLabel(el: Element): string {
  const named = el.getAttribute('data-field-label') ?? el.getAttribute('aria-label')
  if (named) return tidy(named)
  const label = el.closest('label')
  const text = label?.querySelector('span') ?? label
  return tidy(text?.textContent) || tidy(el.getAttribute('placeholder'))
}

const TEXT_TYPES = new Set(['text', 'url', ''])

function plainTarget(el: HTMLInputElement | HTMLTextAreaElement): InsertTarget {
  return {
    label: fieldLabel(el),
    connected: () => el.isConnected && !el.disabled && !el.readOnly,
    insert(text) {
      const value = el instanceof HTMLInputElement ? text.replace(/\s*\n\s*/g, ' ') : text
      el.focus()
      const start = el.selectionStart ?? el.value.length
      const end = el.selectionEnd ?? start
      el.setRangeText(value, start, end, 'end')
      el.dispatchEvent(new Event('input', { bubbles: true }))
      el.dispatchEvent(new Event('change', { bubbles: true }))
    },
  }
}

function onfocusin(event: FocusEvent) {
  const el = event.target
  if (!(el instanceof HTMLElement) || el.closest('[data-no-insert]')) return
  for (const [root, insert] of inserters)
    if (root.contains(el)) {
      inserting.target = {
        label: fieldLabel(root),
        connected: () => root.isConnected && inserters.has(root),
        insert,
      }
      return
    }
  if (
    el instanceof HTMLTextAreaElement ||
    (el instanceof HTMLInputElement && TEXT_TYPES.has(el.type))
  )
    inserting.target = plainTarget(el)
}

if (typeof document !== 'undefined') document.addEventListener('focusin', onfocusin)
