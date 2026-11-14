import type { SessionState } from '@open-tabletop/session'
import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * A fight of the Grey Marches played in Travel, as the stage tells it (docs/fight-turn.md): a
 * turn in one piece, nothing said of what it hasn't done, its end.
 */
async function openTravel() {
  vi.resetModules()
  const { render } = await import('svelte/server')
  const { TripRoom, tellFight, journalContext, translator } =
    await import('@open-tabletop/travel-ui')
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
  /** The fight as told from the trip's journal, whatever the screen shows. */
  const told = () => {
    const s = trip.saved.session!
    const context = journalContext({
      system: trip.system,
      session: s,
      locale: 'en',
      t: translator(() => 'en'),
      startDay: 1,
    })
    const from = s.journal.findLastIndex((e) => e.code === 'ENCOUNTER_STARTED')
    return tellFight(s.journal.slice(from), context, {
      whoName: (id) => session.participantName(s, id),
      isMain: (path) => path.endsWith('.health'),
      waiting: !!s.yours?.length,
    })
  }
  return { trip, session, text, told }
}

describe('a fight on the stage', () => {
  beforeEach(() => {
    localStorage.clear()
    // The player rolls their own rolls (their preference, in every trip).
    localStorage.setItem('opentabletop.dice', JSON.stringify({ rolls: 'mine' }))
    vi.spyOn(Math, 'random').mockReturnValue(0.42)
  })

  it('the Grey Marches: a blow of the player’s told in one piece, from the roll waiting to the fight’s end', async () => {
    const { trip, session: s, text, told } = await openTravel()
    await trip.create('grey-marches', 'spring')
    const rules = s.partyOf(trip.system)
    // Kael against one bandit on its last legs.
    trip.edit((x) => {
      let next: SessionState = {
        ...x,
        members: [s.newMember(rules, { id: 'kael', name: 'Kael' })],
      }
      next = s.applyResult(next, { effects: { 'present.bandit': 1 } }, {}, rules)
      next = s.applyResult(
        next,
        { effects: { 'characters.bandit.values.health': '=1' } },
        {},
        rules,
      )
      s.refreshParty(next, rules)
      return next
    })
    await trip.step({ type: 'action', id: 'stand' })
    // On to Kael's turn (the bandit may act first: its turn is the computer's).
    for (let i = 0; i < 6 && !s.encounterView(trip.saved.session!)?.choosing; i++)
      await trip.step({ type: 'encounter', what: 'next' })
    expect(s.encounterView(trip.saved.session!)?.choosing).toBe(true)
    expect(text()).toContain('Kael’s turn')

    await trip.step({ type: 'action', id: 'strike', with: { foe: 'bandit' } })
    // The blow waits for the player's roll: who, what and whom, and not a word of its result.
    const yours = trip.saved.session!.yours!
    expect(yours.map((y) => y.table)).toEqual(['grey-marches/blow'])
    let shown = text()
    expect(shown).toContain('Strike one down')
    // A lone foe: the blow's roll mode, and how it rolls.
    expect(shown).toContain('Kael: roll 1d6 for')
    expect(shown).toContain('2 rolls, the highest kept')
    expect(shown).not.toContain('Nothing on the table changes')
    expect(told().turns.at(-1)).toMatchObject({ who: 'Kael', stage: 'rolling', outcome: [] })

    await trip.step({ type: 'rolled', id: yours[0]!.id, total: 3 })
    // The bandit fell, was stripped by the computer, and the fight is over: all of it Kael's turn.
    expect(trip.saved.session!.encounter).toBeUndefined()
    expect(trip.saved.session!.yours ?? []).toEqual([])
    const fight = told()
    const turn = fight.turns.at(-1)!
    expect(turn).toMatchObject({ who: 'Kael', stage: 'told', what: 'Kael strikes at Bandit' })
    expect(turn.outcome[0]).toMatch(/^3 harm/)
    expect(turn.outcome).toContain('Bandit: Health: 1 → 0')
    expect(turn.outcome).toContain('Bandit falls')
    // Said once: its leaving is the fall; what its fall set off is apart, in words.
    expect(turn.outcome.filter((line) => line.includes('Bandit')).length).toBe(2)
    expect(turn.more.some((line) => line.startsWith('What the fallen leave: '))).toBe(true)
    expect([...turn.outcome, ...turn.more].join(' ')).not.toMatch(
      /present\.leave|Whoever acts|Moment:/,
    )
    expect(fight.ended).toMatchObject({ rounds: 1, gone: ['Bandit is gone (Down)'] })
    shown = text()
    expect(shown).not.toContain('present.leave')
  }, 30_000)
})
