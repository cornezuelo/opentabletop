import type { Tab } from './nav.svelte'

/** A group of a system's tabs; `label` names it in `tabs.groups`. */
export interface TabGroup {
  label?: 'rules' | 'characters' | 'world'
  tabs: Tab[]
}

/** A system's tabs, in groups and in the order they're shown. */
export const TAB_GROUPS: TabGroup[] = [
  { tabs: ['overview'] },
  { label: 'rules', tabs: ['rules', 'checks', 'modes'] },
  { label: 'characters', tabs: ['sheet', 'items', 'bestiary'] },
  {
    label: 'world',
    tabs: ['places', 'pieces', 'factions', 'clocks', 'world', 'calendar', 'weather', 'land'],
  },
  { tabs: ['try', 'yaml'] },
]

export const TABS: Tab[] = TAB_GROUPS.flatMap((g) => g.tabs)

/** The tabs of its parts, written in its pack. */
const PARTS = new Set<Tab>([
  'sheet',
  'items',
  'bestiary',
  'places',
  'pieces',
  'factions',
  'clocks',
  'world',
  'calendar',
  'weather',
  'land',
  'modes',
])

/**
 * The tabs a system shows, in their groups: its travel rules' (when it has them), its parts'
 * (when it has a pack), its files' (when it has some), and the rest always. A group left
 * with nothing goes.
 */
export function systemTabs(has: { rules: boolean; pack: boolean; files: boolean }): TabGroup[] {
  const shown = (tab: Tab) =>
    tab === 'rules' || tab === 'checks'
      ? has.rules
      : PARTS.has(tab)
        ? has.pack
        : tab === 'yaml'
          ? has.files
          : true
  return TAB_GROUPS.map((g) => ({ ...g, tabs: g.tabs.filter(shown) })).filter((g) => g.tabs.length)
}
