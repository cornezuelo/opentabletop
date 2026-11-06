import { describe, expect, it } from 'vitest'
import { systemTabs, TABS } from './tabs'

const flat = (has: Parameters<typeof systemTabs>[0]) => systemTabs(has).flatMap((g) => g.tabs)

/** A tab listed twice made Svelte refuse the page (each_key_duplicate): the system was blank. */
describe('a system’s tabs', () => {
  it('lists each tab once, in order', () => {
    expect(new Set(TABS).size).toBe(TABS.length)
    expect(flat({ rules: true, pack: true, files: true })).toEqual(TABS)
  })

  it('leaves out what the system lacks', () => {
    expect(flat({ rules: false, pack: false, files: false })).toEqual(['overview', 'try'])
    expect(flat({ rules: true, pack: false, files: true })).toEqual([
      'overview',
      'rules',
      'checks',
      'try',
      'yaml',
    ])
  })
})
