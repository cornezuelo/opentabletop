import type { Translate } from './i18n'

/** The writing bar's keys (notes-ui's `NoteEditor`), as its tooltips and lists show them. */
export const WRITING_KEYS = {
  bold: ['Ctrl+B'],
  italic: ['Ctrl+I'],
  strike: [] as string[],
  title: ['Ctrl+1'],
  section: ['Ctrl+2'],
  subsection: ['Ctrl+3'],
  normal: ['Ctrl+0'],
  toPage: ['Ctrl+K'],
  toWeb: ['Ctrl+Shift+K'],
  markdown: ['F1'],
}

/** The writing bar's keys as a group of an app's list of shortcuts (ui-kit's `ShortcutsButton`). */
export function writingShortcuts(t: Translate) {
  const keyed = [
    'bold',
    'italic',
    'title',
    'section',
    'subsection',
    'normal',
    'toPage',
    'toWeb',
  ] as const
  return {
    title: t('bar.label'),
    shortcuts: [
      ...keyed.map((name) => ({ keys: WRITING_KEYS[name], does: t(`bar.${name}`) })),
      { keys: WRITING_KEYS.markdown, does: t('bar.markdownTip') },
    ],
  }
}
