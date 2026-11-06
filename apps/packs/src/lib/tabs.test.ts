import { describe, expect, it } from 'vitest'
import { systemTabs, TABS } from './tabs'

/** A tab listed twice made Svelte refuse the page (each_key_duplicate): the system was blank. */
describe('a system’s tabs', () => {
  it('lists each tab once, in order', () => {
    expect(new Set(TABS).size).toBe(TABS.length)
    expect(systemTabs({ rules: true, pack: true, files: true })).toEqual(TABS)
  })

  it('leaves out what the system lacks', () => {
    expect(systemTabs({ rules: false, pack: false, files: false })).toEqual(['overview', 'try'])
    expect(systemTabs({ rules: true, pack: false, files: true })).toEqual([
      'overview',
      'rules',
      'checks',
      'try',
      'yaml',
    ])
  })
})
