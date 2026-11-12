import { beforeAll, describe, expect, it, vi } from 'vitest'

describe("Campaign's addresses", () => {
  let parseView: typeof import('./nav.svelte').parseView
  let formatView: typeof import('./nav.svelte').formatView
  beforeAll(async () => {
    vi.stubGlobal('location', { hash: '' })
    vi.stubGlobal('window', { addEventListener: () => {} })
    ;({ parseView, formatView } = await import('./nav.svelte'))
  })

  it('a scene opens in its campaign’s Scenes, or found by its id alone', () => {
    const view = parseView('#/campaign/vale/scenes/s1')
    expect(view).toEqual({ name: 'campaign', id: 'vale', tab: 'scenes', scene: 's1' })
    expect(formatView(view)).toBe('#/campaign/vale/scenes/s1')
    expect(parseView('#/campaign/vale/scenes')).toEqual({
      name: 'campaign',
      id: 'vale',
      tab: 'scenes',
    })
    expect(parseView('#/scene/s1')).toEqual({ name: 'scene', id: 's1' })
    expect(formatView({ name: 'scene', id: 's1' })).toBe('#/scene/s1')
  })

  it('a faction still opens as before', () => {
    expect(parseView('#/campaign/vale/factions/guild')).toEqual({
      name: 'campaign',
      id: 'vale',
      tab: 'factions',
      faction: 'guild',
    })
  })
})
