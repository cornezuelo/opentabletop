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

describe('those present', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.spyOn(Math, 'random').mockReturnValue(0.42)
  })

  it('shows who is here grouped by template, and those left behind', async () => {
    const { trip, session: s, text } = await openTravel()
    await trip.create('grey-marches', 'spring')
    for (let i = 0; i < 4; i++) trip.addHex({ terrain: 'plains', tags: [], connections: ['road'] })
    // Nobody yet: the box says so, and offers the system's bestiary.
    let shown = text()
    expect(shown).toContain('Nobody here.')
    expect(shown).toContain('Add from the bestiary')
    expect(shown).toContain('Grey wolf')

    // Three wolves and their leader come (without one they break), as an encounter's
    // effects would make them; and the Wyrm.
    const rules = s.partyOf(trip.system)
    trip.edit((x) => {
      const next = structuredClone(x)
      s.changePresent(next, rules, 'grey-wolf', 3)
      s.changePresent(next, rules, 'pack-leader', 1)
      s.changePresent(next, rules, 'wyrm', 1)
      return next
    })
    const wolves = trip.saved.session!.present!.filter(
      (p) => p.character.template?.id === 'grey-wolf',
    )
    expect(wolves).toHaveLength(3)
    shown = text()
    expect(shown).not.toContain('Nobody here.')
    expect(shown).toContain('Grey wolf ×3')
    // Each copy in one line: the values its sheet shows first.
    const wolf = wolves[1].character
    expect(shown).toContain(`Health ${wolf.values.health} · Harm ${wolf.values.harm}`)

    // The party moves on: the pack (`behind: leave`) is gone, the Wyrm stays in its place.
    await trip.step({ type: 'action', id: 'march' })
    const left = trip.saved.session!.present ?? []
    expect(trip.saved.session!.travel.location).not.toBe('0')
    expect(left.map((p) => p.character.template?.id)).toEqual(['wyrm'])
    shown = text()
    expect(shown).toContain('1 left behind elsewhere')
    expect(shown).toContain('Nobody here.')
  })
})
