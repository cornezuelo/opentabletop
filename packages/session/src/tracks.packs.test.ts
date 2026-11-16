import type { SessionState } from './index'
import { createOracleEngine, loadPacks } from '@open-tabletop/oracle-engine'
import { seeded } from '@open-tabletop/random'
import type { TravelWorld } from '@open-tabletop/travel-engine'
import { describe, expect, it } from 'vitest'
import { corePack, greyMarchesPack } from './core.testing'
import { applyResult } from './index'
import { newMember } from './party'
import { partyOf, startTrip, stepTrip, travelSystems, settleTrip } from './trip'

const { registry } = loadPacks([...corePack(), ...greyMarchesPack()])
const { systems } = travelSystems(registry)
const marches = systems.find((s) => s.id === 'grey-marches')!
const rules = partyOf(marches)

// a — b — c through dangerous heath: wolves walk here.
const heath: TravelWorld = {
  km: () => 1,
  place: () => ({ terrain: 'heath', danger: 4 }),
  neighbors: (h) => ({ a: ['b'], b: ['a', 'c'], c: ['b'] })[h] ?? [],
  distance: (x, y) => Math.abs(x.charCodeAt(0) - y.charCodeAt(0)),
  connections: () => [],
}
const options = {
  system: marches,
  world: heath,
  oracle: createOracleEngine({ registry, random: seeded('marches') }),
}

/** A morning on the heath with two companions; a seed of the trip's own. */
const start = (seed: string): SessionState => {
  const members = [
    newMember(rules, { id: 'kael', name: 'Kael' }),
    newMember(rules, { id: 'mara', name: 'Mara' }),
  ]
  const { session } = startTrip({ system: marches, location: 'a', members, seed, time: 9 * 60 })
  return { ...session, foesAtOnce: true, acting: 'kael' }
}

/** Takes an action, rolling whatever it asks; the first seed where `done` holds after it. */
function until(action: string, done: (s: SessionState) => boolean, answer?: string): SessionState {
  for (let i = 0; i < 200; i++) {
    const seeded_ = { ...options, oracle: createOracleEngine({ registry, random: seeded(i) }) }
    let s = stepTrip(seeded_, start(`tracks-${i}`), { type: 'action', id: action }).state
    // What the action asks (Scout ahead: how), answered.
    if (s.travel.waiting?.ask)
      s = stepTrip(seeded_, s, { type: 'resume', choice: String(answer) }).state
    for (let j = 0; j < 4 && s.travel.pendingChecks.length; j++)
      s = stepTrip(seeded_, s, { type: 'resolveCheck', id: s.travel.pendingChecks[0].id }).state
    if (done(s)) return s
  }
  throw new Error(`${action}: never in 200 seeds`)
}

describe('the Grey Marches: tracks and scouting that matter', () => {
  it('fresh tracks leave the Company forewarned here: a fight begun here starts with its turns', () => {
    let s = until('look-for-tracks', (x) => x.party?.conditions.forewarned !== undefined)
    expect(s.party!.conditions.forewarned).toMatchObject({ left: 1 })
    // On the heath, they're a wolf pack's.
    const said = s.journal.filter((e) => e.code === 'ORACLE_RESULT').map((e) => e.text)
    expect(said.at(-1)).toMatch(/^Wolf-prints/)
    // The wolves come: the companions act first, however the wolves roll, and the warning is
    // spent.
    s = settleTrip(
      options,
      applyResult(s, { effects: { 'present.grey-wolf': 2 } }, {}, rules),
    ).state
    const fight = stepTrip(options, s, { type: 'action', id: 'stand' })
    const order = fight.state.encounter!.order
    expect(order.slice(0, 2).sort()).toEqual(['kael', 'mara'])
    expect(fight.state.party!.conditions.forewarned).toBeUndefined()
    expect(
      fight.entries.some((e) => e.code === 'ACTION_TAKEN' && e.data?.action === 'forewarned'),
    ).toBe(true)
  })

  it('the warning is this place’s only: gone as the next is entered', () => {
    let s = until('look-for-tracks', (x) => x.party?.conditions.forewarned !== undefined)
    s = stepTrip(options, s, { type: 'setDestination', place: 'b' }).state
    for (let i = 0; i < 4 && s.travel.location !== 'b'; i++) {
      for (const c of s.travel.pendingChecks)
        s = stepTrip(options, s, { type: 'resolveCheck', id: c.id }).state
      s = stepTrip(options, s, { type: 'action', id: 'march', with: { until: 'place' } }).state
    }
    expect(s.travel.location).toBe('b')
    expect(s.party!.conditions.forewarned).toBeUndefined()
  })

  it('a way scouted: the next place’s encounter is rolled Warned, then it’s gone', () => {
    let s = until('scout', (x) => x.party?.conditions.scouted !== undefined, 'stealth')
    expect(s.party!.conditions.scouted).toMatchObject({ left: 2 })
    s = stepTrip(options, s, { type: 'setDestination', place: 'c' }).state
    const rolled: unknown[] = []
    for (let i = 0; i < 8 && s.travel.location !== 'c'; i++) {
      for (const c of s.travel.pendingChecks) {
        const done = stepTrip(options, s, { type: 'resolveCheck', id: c.id })
        rolled.push(...done.entries)
        s = done.state
      }
      const done = stepTrip(options, s, { type: 'action', id: 'march', with: { until: 'place' } })
      rolled.push(...done.entries)
      s = done.state
      // Whoever the encounter brought is dealt with: away they go.
      if (s.present?.length) s = { ...s, present: [] }
      if (s.travel.location === 'b') {
        expect(s.party!.conditions.scouted).toMatchObject({ left: 1 })
      }
    }
    expect(s.travel.location).toBe('c')
    // b's encounter was rolled Warned (twice, the lower kept); c's, the way no longer
    // scouted, wasn't.
    const modes = (rolled as { code: string; data?: Record<string, unknown> }[])
      .filter((e) => e.code === 'ROLLED' && e.data?.check === 'ENCOUNTER_CHECK_REQUIRED')
      .map((e) => (e.data?.rolls as { mode?: string }[])[0].mode)
    expect(modes).toEqual(['grey-marches/warned', undefined])
    expect(s.party!.conditions.scouted).toBeUndefined()
  })
})
