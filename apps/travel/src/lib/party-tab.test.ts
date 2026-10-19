import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * The trip panel's Party tab on a Grey Marches trip: one place for the party, its sheet
 * and stats each saying where it comes from, and whose sheet every card is.
 */
async function openTravel() {
  vi.resetModules()
  const { render } = await import('svelte/server')
  const { TripRoom } = await import('@open-tabletop/travel-ui')
  const session = await import('@open-tabletop/session')
  const { trip } = await import('./trip.svelte')
  const { systems } = await import('./packs.svelte')
  const text = () =>
    render(TripRoom, {
      props: {
        trip,
        system: trip.system,
        systems: systems.list,
        locale: 'en',
        tags: [],
        onsystem: () => {},
      },
    })
      .body.replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
  return { trip, session, text }
}

describe('the Party tab', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.spyOn(Math, 'random').mockReturnValue(0.42)
  })

  it('says where each stat comes from, and whose each sheet is', async () => {
    const { trip, session: s, text } = await openTravel()
    await trip.create('grey-marches', 'spring')
    // A party played as a whole: its stats are plain numbers, said by no one.
    expect(text()).toContain('Sheet: The Company · The Grey Marches')
    expect(text()).toContain('Edit in Systems ↗')
    expect(text()).not.toContain('the highest')

    const rules = s.partyOf(trip.system)
    const kael = s.newMember(rules, {
      id: 'kael',
      name: 'Kael',
      values: { pathfinding: 2, charisma: 0, stealth: 1, survival: 2 },
    })
    const brenna = s.newMember(rules, {
      id: 'brenna',
      name: 'Brenna',
      values: { pathfinding: 1, charisma: 3, stealth: 3, survival: 1 },
    })
    trip.edit((x) => {
      const next = { ...x, members: [kael, brenna] }
      s.refreshParty(next, rules)
      return next
    })
    let shown = text()
    // Characters' sheet, and the stats made of theirs.
    expect(shown).toContain('Sheet: Companion · The Grey Marches')
    expect(shown).toContain('Kael’s Pathfinding, the highest')
    expect(shown).toContain('Kael’s Stealth, the lowest')
    expect(shown).toContain('Brenna’s Charisma, the highest')

    // Who rolls: Kael talks now.
    trip.edit((x) => ({ ...x, rolls: 'kael' }))
    trip.edit((x) => {
      const next = { ...x, stats: { ...x.stats } }
      s.refreshParty(next, rules)
      return next
    })
    shown = text()
    expect(shown).toContain('Kael’s Charisma (Rolls with)')
    expect(trip.saved.session!.stats.charisma).toBe(0)
  })
})
