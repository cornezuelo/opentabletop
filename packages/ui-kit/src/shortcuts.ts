/**
 * Keyboard shortcuts as data: each app lists its own, and the same list is shown in the
 * shortcuts dialog, under a tool that has keys of its own and in a button's tooltip, so a
 * key is written once.
 */

/**
 * One shortcut: the ways of pressing it (each a combination of keys joined by `+`:
 * `Ctrl+Shift+Z`, `Shift+Arrows`, `Ctrl+Click`) and what it does.
 */
export type Shortcut = { keys: string[]; does: string }
/** Shortcuts that go together (the tools, the view…), under a title. */
export type ShortcutGroup = { title: string; shortcuts: Shortcut[] }

/** Undo and redo, the same keys in every app that undoes. */
export const UNDO_KEYS = { undo: ['Ctrl+Z'], redo: ['Ctrl+Shift+Z', 'Ctrl+Y'] }

/** What a key reads as on its cap, where its name isn't the key itself. */
const NAMES: Record<string, { en: string; es: string }> = {
  Ctrl: { en: 'Ctrl', es: 'Ctrl' },
  Shift: { en: 'Shift', es: 'Mayús' },
  Alt: { en: 'Alt', es: 'Alt' },
  Esc: { en: 'Esc', es: 'Esc' },
  Enter: { en: 'Enter', es: 'Intro' },
  Backspace: { en: 'Backspace', es: 'Retroceso' },
  Delete: { en: 'Delete', es: 'Supr' },
  Space: { en: 'Space', es: 'Espacio' },
  Up: { en: '↑', es: '↑' },
  Down: { en: '↓', es: '↓' },
  Left: { en: '←', es: '←' },
  Right: { en: '→', es: '→' },
  Arrows: { en: '← ↑ → ↓', es: '← ↑ → ↓' },
  WASD: { en: 'W A S D', es: 'W A S D' },
  Click: { en: 'click', es: 'clic' },
  'Right click': { en: 'right click', es: 'clic derecho' },
  Drag: { en: 'drag', es: 'arrastrar' },
  Wheel: { en: 'wheel', es: 'rueda' },
  'Middle button': { en: 'middle button', es: 'botón central' },
}

/** One key of a combination, as its cap reads, and whether it's a key or a mouse's doing. */
export type KeyCap = { label: string; mouse: boolean }

const MOUSE = new Set(['Click', 'Right click', 'Drag', 'Wheel', 'Middle button'])

/** The caps of a combination (`Ctrl+Shift+Z` → Ctrl, Mayús, Z in Spanish). */
export function keyCaps(combo: string, locale: string): KeyCap[] {
  const lang = locale === 'es' ? 'es' : 'en'
  // A `+` alone is the key itself (`Ctrl++`), never a separator.
  const parts = combo === '+' ? ['+'] : combo.split(/\+(?!$)/).map((part) => part.trim())
  return parts.map((part) => ({
    label: NAMES[part]?.[lang] ?? (part.length === 1 ? part.toUpperCase() : part),
    mouse: MOUSE.has(part),
  }))
}

/** A combination written out in one line, for a tooltip read aloud or a list as text. */
export function keysText(keys: string[], locale: string): string {
  return keys
    .map((combo) =>
      keyCaps(combo, locale)
        .map((cap) => cap.label)
        .join('+'),
    )
    .join(' / ')
}

const TEXT_INPUT_TYPES = new Set(['text', 'search', 'number', 'email', 'url', 'password', 'tel'])

/**
 * True when keys go to a text field (or the YAML editor). Sliders, checkboxes, color pickers
 * and buttons don't count, so shortcuts like Ctrl+Z still work right after using them.
 */
export function isTyping(e: KeyboardEvent): boolean {
  const target = e.target
  // Keys sent to the window or the document itself aren't typing.
  if (!(target instanceof Element)) return false
  if (target instanceof HTMLInputElement) return TEXT_INPUT_TYPES.has(target.type)
  return !!target.closest('textarea, select, [contenteditable="true"], .cm-editor')
}
