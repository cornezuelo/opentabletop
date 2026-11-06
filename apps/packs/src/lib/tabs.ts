import type { Tab } from './nav.svelte'

/** A system's tabs, in the order they're shown. */
export const TABS: Tab[] = [
  'overview',
  'rules',
  'checks',
  'sheet',
  'items',
  'bestiary',
  'places',
  'factions',
  'clocks',
  'world',
  'calendar',
  'weather',
  'land',
  'modes',
  'try',
  'yaml',
]

/** The tabs of its parts, written in its pack. */
const PARTS = new Set<Tab>([
  'sheet',
  'items',
  'bestiary',
  'places',
  'factions',
  'clocks',
  'world',
  'calendar',
  'weather',
  'land',
  'modes',
])

/**
 * The tabs a system shows, each once and in order: its travel rules' (when it has them), its
 * parts' (when it has a pack), its files' (when it has some), and the rest always.
 */
export function systemTabs(has: { rules: boolean; pack: boolean; files: boolean }): Tab[] {
  return TABS.filter((tab) =>
    tab === 'rules' || tab === 'checks'
      ? has.rules
      : PARTS.has(tab)
        ? has.pack
        : tab === 'yaml'
          ? has.files
          : true,
  )
}
