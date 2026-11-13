import { afterEach, describe, expect, it, vi } from 'vitest'

/** Travel's way told a place at a time: where the party stands follows the telling. */
describe('a march told a place at a time in Travel', () => {
  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('moves along the way one place after another, and Tell it all ends it', async () => {
    vi.resetModules()
    localStorage.clear()
    vi.spyOn(Math, 'random').mockReturnValue(0.42)
    const { pacing } = await import('@open-tabletop/travel-ui')
    const { trip } = await import('./trip.svelte')
    await trip.create('grey-marches', 'spring')
    for (let i = 0; i < 4; i++) trip.addHex()
    pacing.setPace('slow')
    vi.useFakeTimers()
    await trip.step({ type: 'action', id: 'march' })
    const session = trip.saved.session!
    const end = Number(session.travel.location)
    expect(end).toBeGreaterThan(1)
    expect(pacing.tells(session)).toBe(true)
    const here = () => Number(pacing.view(session).travel.location)
    expect(here()).toBe(1)
    vi.advanceTimersByTime(1100)
    if (!pacing.holds(session)) expect(here()).toBe(Math.min(2, end))
    pacing.finish()
    expect(here()).toBe(end)
    expect(pacing.view(session)).toBe(session)
  })
})
