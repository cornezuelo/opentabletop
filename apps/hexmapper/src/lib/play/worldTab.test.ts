import { beforeEach, describe, expect, it, vi } from 'vitest'

/** The World panel's tab is remembered per viewer, like the trip panel's. */
describe('the World panel’s tab', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.resetModules()
  })

  it('starts unchosen, and comes back as chosen on the next visit', async () => {
    let { worldTab } = await import('./worldTab.svelte')
    expect(worldTab.chosen).toBeUndefined()
    worldTab.choose('factions')
    expect(localStorage.getItem('opentabletop.world.tab')).toBe('factions')
    vi.resetModules()
    ;({ worldTab } = await import('./worldTab.svelte'))
    expect(worldTab.chosen).toBe('factions')
  })

  it('ignores a tab it doesn’t know', async () => {
    localStorage.setItem('opentabletop.world.tab', 'weather')
    const { worldTab } = await import('./worldTab.svelte')
    expect(worldTab.chosen).toBeUndefined()
  })
})
