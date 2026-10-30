import { createOracleEngine, loadPacks } from '@open-tabletop/oracle-engine'
import { seeded } from '@open-tabletop/random'
import type { TravelWorld } from '@open-tabletop/travel-engine'
import { describe, expect, it } from 'vitest'
import { corePack, greyMarchesPack } from './core.testing'
import { applyResult } from './index'
import { newMember } from './party'
import { partyOf, startTrip, stepTrip, travelSystems, tripAvailability, tripFacts } from './trip'

const { registry } = loadPacks([...corePack(), ...greyMarchesPack()])
const { systems, problems } = travelSystems(registry)
const marches = systems.find((s) => s.id === 'grey-marches')!
const core = systems.find((s) => s.id === 'core')!
const heath: TravelWorld = {
  km: () => 10,
  place: () => ({ terrain: 'heath', fields: { danger: '4' } }),
  neighbors: () => [],
  distance: () => 0,
  edges: () => [],
}

/** A result of a table rolled as a trip's check would, with a seed that brings `entry`. */
function rollUntil(table: string, entry: string, context: Record<string, unknown>) {
  for (let seed = 1; seed < 200; seed++) {
    const out = createOracleEngine({ registry, random: seeded(seed) }).resolve(table, context)
    if (out.resolution.entry === entry) return out.resolution
  }
  throw new Error(`no ${entry} in 200 seeds`)
}

describe('the bundled packs make foes from their bestiaries', () => {
  it('load without problems', () => {
    expect(problems.filter((p) => p.at?.startsWith('@bestiary'))).toEqual([])
    expect(marches.bestiary?.map((b) => b.id)).toEqual(['grey-marches/marches'])
    expect(core.bestiary?.map((b) => b.id)).toEqual(['core/foes'])
  })

  it('the Grey Marches: wolves come with their leader, are driven off, and the pack breaks', () => {
    const rules = partyOf(marches)
    const members = [
      newMember(rules, { id: 'kael', name: 'Kael', values: { survival: 2 } }),
      newMember(rules, { id: 'mara', name: 'Mara' }),
    ]
    const { session } = startTrip({ system: marches, location: 'a', members, seed: 'x' })
    const facts = tripFacts({ system: marches, world: heath }, session)
    const wolves = rollUntil('grey-marches/table.encounter', 'wolves', {
      ...facts,
      'place.terrain': 'heath',
      'place.danger': 4,
      'time.season': 'autumn',
    })
    const count = Number(wolves.text!.split(' ')[0])
    expect(wolves.text).toMatch(/^\d grey wolves, their leader among them — they are /)
    let s = applyResult(session, wolves.value, marches.bindings?.stats, rules)
    const here = () =>
      tripFacts({ system: marches, world: heath }, s).present as Record<string, unknown>
    expect(here()).toMatchObject({
      count,
      'grey-wolf': { count: count - 1 },
      'pack-leader': { count: 1 },
      tags: ['beast', 'pack', 'leader'],
    })
    expect(s.present!.at(-1)!.character).toMatchObject({
      name: 'Pack leader',
      sheet: 'grey-marches/foe',
      values: { harm: 2, morale: 9 },
    })
    // Nothing to buy off (no outlaws); something to drive off.
    s = { ...s, acting: 'kael' }
    const open = tripAvailability({ system: marches, world: heath }, s)
    expect(open['drive-off']).toBeUndefined()
    expect(open['buy-off']).toMatchObject({ condition: 'when' })
    // The leader struck down by hand: the pack breaks and runs at the next step.
    s = applyResult(s, { effects: { 'characters.pack-leader.values.health': '=0' } }, {}, rules)
    const done = stepTrip({ system: marches, world: heath }, s, {
      type: 'action',
      id: 'drive-off',
    })
    expect(done.state.present).toEqual([])
    const codes = done.entries.map((e) => e.code)
    expect(codes).toContain('PRESENT_LEFT')
    expect(
      done.entries.some((e) => e.data?.id === 'pack-leader' && e.data?.because === 'condition'),
    ).toBe(true)
    // Kael's Survival 2: no harm to him.
    expect(done.state.members!.find((m) => m.id === 'kael')!.values.health).toBe(3)
  })

  it('the Grey Marches: bandits and their chief are bought off with rations', () => {
    const rules = partyOf(marches)
    const members = [newMember(rules, { id: 'kael', name: 'Kael' })]
    const { session } = startTrip({ system: marches, location: 'a', members, seed: 'x' })
    const hills = { ...heath, place: () => ({ terrain: 'hills', fields: { danger: '4' } }) }
    const facts = tripFacts({ system: marches, world: hills }, session)
    const bandits = rollUntil('grey-marches/table.encounter', 'bandits', facts)
    let s = applyResult(session, bandits.value, marches.bindings?.stats, rules)
    const count = Number(bandits.text!.split(' ')[0])
    expect(s.present).toHaveLength(count)
    expect(s.present!.at(-1)!.character.name).toBe('Bandit chief')
    // Enough rations for all of them (two each companion starts with, and more).
    s = applyResult(s, { effects: { 'party.items.ration': count } }, {}, rules)
    expect(tripAvailability({ system: marches, world: heath }, s)['buy-off']).toBeUndefined()
    const paid = stepTrip({ system: marches, world: heath }, s, { type: 'action', id: 'buy-off' })
    expect(paid.state.present).toEqual([])
    expect(
      paid.entries.filter((e) => e.code === 'PRESENT_LEFT').map((e) => e.data?.condition),
    ).toEqual(Array(count).fill('bought-off'))
  })

  it('Core: trouble on the road makes its foes, gone once down', () => {
    const rules = partyOf(core)
    const { session } = startTrip({ system: core, location: 'a', seed: 'x' })
    const trouble = rollUntil('core/table.trouble', 'foes', {})
    const count = Number(trouble.text!.split(' ')[0])
    let s = applyResult(session, trouble.value, {}, rules)
    expect(s.present).toHaveLength(count)
    expect(s.present![0].character).toMatchObject({ name: 'Foe', sheet: 'core/character' })
    s = applyResult(s, { effects: { 'present.foe.values.health': '=0' } }, {}, rules)
    const done = stepTrip({ system: core, world: heath }, s, { type: 'moment', at: '' })
    expect(done.state.present).toEqual([])
  })
})
