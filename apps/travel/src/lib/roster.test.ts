import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Travel's trips and the roster (the Characters app): a trip takes roster characters, keeps
 * them in step after every step and edit, catches up with what the roster changed, and lets
 * them go when it no longer has them.
 */
async function openTravel() {
  vi.resetModules()
  const { roster } = await import('@open-tabletop/character-ui')
  const session = await import('@open-tabletop/session')
  const { trip } = await import('./trip.svelte')
  return { roster, session, trip }
}

describe('trips and the roster', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.spyOn(Math, 'random').mockReturnValue(0.42)
  })

  it('takes a roster character, keeps it in step, and lets it go', async () => {
    const { roster, session: s, trip } = await openTravel()
    await trip.create('grey-marches', 'spring')
    trip.addHex()
    trip.addHex()
    const system = trip.system
    // Made in the Characters app: in the roster, playing nowhere.
    const brenna = s.newMember(s.partyOf(system), { id: 'brenna', name: 'Brenna' })
    roster.set(s.keepInRoster(roster.roster, brenna, 'T0').roster)
    const place = trip.place!
    expect(place).toMatchObject({ app: 'travel', id: trip.saved.id })

    // From the roster (what the party's Characters does).
    const taken = s.takeFromRoster(roster.roster, 'brenna', place, 'T1')!
    roster.set(taken.roster)
    trip.edit((x) => ({ ...x, members: [...(x.members ?? []), taken.character] }))
    expect(s.isLinked(roster.roster, 'brenna', place)).toBe(true)

    // Hurt on the way: the roster has it after the edit, and after a march.
    trip.edit((x) => ({
      ...x,
      members: x.members!.map((m) => ({ ...m, values: { ...m.values, health: 1 } })),
    }))
    expect(s.rosterEntry(roster.roster, 'brenna')!.character.values.health).toBe(1)
    await trip.step({ type: 'action', id: 'march' })
    expect(s.rosterEntry(roster.roster, 'brenna')!.character).toEqual(
      trip.saved.session!.members!.find((m) => m.id === 'brenna'),
    )

    // Healed in the Characters app: the trip catches up, and the journal says so.
    roster.set(
      s.editInRoster(
        roster.roster,
        'brenna',
        (e) => ({
          ...e,
          character: { ...e.character, values: { ...e.character.values, health: 6 } },
        }),
        'T2',
      ),
    )
    trip.pullRoster()
    const members = trip.saved.session!.members!
    expect(members.find((m) => m.id === 'brenna')!.values.health).toBe(6)
    expect(trip.saved.session!.journal.at(-1)).toMatchObject({
      code: 'ROSTER_UPDATED',
      data: { names: ['Brenna'] },
    })

    // Kept for the next page load, still linked.
    const again = await openTravel()
    expect(again.session.isLinked(again.roster.roster, 'brenna', again.trip.place!)).toBe(true)

    // Taken out of the party: it stays in the roster, playing nowhere.
    again.trip.edit((x) => ({ ...x, members: x.members!.filter((m) => m.id !== 'brenna') }))
    expect(again.session.rosterEntry(again.roster.roster, 'brenna')!.playing).toBeUndefined()
  })

  it('a character travels in one trip at a time', async () => {
    const { roster, session: s, trip } = await openTravel()
    await trip.create('grey-marches', 'spring')
    const first = trip.place!
    const kael = s.newMember(s.partyOf(trip.system), { id: 'kael', name: 'Kael' })
    roster.set(s.keepInRoster(roster.roster, kael, 'T0', first).roster)
    trip.edit((x) => ({ ...x, members: [kael] }))
    // Another trip takes Kael: the first one keeps an unlinked copy.
    await trip.create('grey-marches', 'summer')
    const second = trip.place!
    const taken = s.takeFromRoster(roster.roster, 'kael', second, 'T1')!
    expect(taken.from).toMatchObject({ id: first.id })
    roster.set(taken.roster)
    trip.edit((x) => ({ ...x, members: [taken.character] }))
    trip.open(first.id)
    trip.edit((x) => ({
      ...x,
      members: x.members!.map((m) => ({ ...m, values: { ...m.values, health: 0 } })),
    }))
    expect(s.rosterEntry(roster.roster, 'kael')!.character.values.health).not.toBe(0)
    expect(s.isLinked(roster.roster, 'kael', second)).toBe(true)
    // Deleting the trip it plays in lets it go.
    trip.open(second.id)
    trip.remove()
    expect(s.rosterEntry(roster.roster, 'kael')!.playing).toBeUndefined()
  })
})
