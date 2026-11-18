import { createOracleEngine, loadPacks } from '@open-tabletop/oracle-engine'
import { seeded } from '@open-tabletop/random'
import type { TravelWorld } from '@open-tabletop/travel-engine'
import { describe, expect, it } from 'vitest'
import { corePack, greyMarchesPack } from './core.testing'
import { applyResult, type JournalEntry, type SessionState } from './index'
import { newMember } from './party'
import { contextSuggestions } from './suggestions'
import { systemUses } from './usage'
import {
  itemActions,
  partyOf,
  settleTrip,
  startTrip,
  stepTrip,
  travelSystems,
  tripAvailability,
  tripFacts,
  useUnavailable,
} from './trip'

// Items held unknown until they're identified, and an item's Use (docs/traps-locks.md §3C),
// played in the bundled packs.
const { registry } = loadPacks([...corePack(), ...greyMarchesPack()])
const { systems, problems } = travelSystems(registry)
const marches = systems.find((s) => s.id === 'grey-marches')!
const core = systems.find((s) => s.id === 'core')!
const road: TravelWorld = {
  km: () => 1,
  place: () => ({ terrain: 'plains' }),
  neighbors: (id) => (id === 'a' ? ['b'] : ['a']),
  distance: () => 1,
  connections: () => ['road'],
}
/** What a table's line did (its result's effects). */
const effectsOf = (e: JournalEntry) =>
  (e.data?.value as { effects?: Record<string, unknown> } | undefined)?.effects ?? {}
const held = (s: SessionState, who: string) =>
  (s.members!.find((m) => m.id === who)!.items ?? []).map((i) => [i.id, i.count, !!i.unknown])

describe('items held unknown, and used', () => {
  it('load without problems; the actions items use are no buttons', () => {
    expect(problems.filter((p) => p.severity !== 'warning' && !/No map/.test(p.message))).toEqual(
      [],
    )
    expect(problems.filter((p) => /use|unknown/.test(p.message))).toEqual([])
    expect([...itemActions(core)]).toEqual(['drink'])
    expect([...itemActions(marches)]).toEqual(['drink'])
    // Its Used by says which item's Use takes it.
    expect(
      systemUses(registry, core).find(
        (u) => u.written === 'actions.drink' && u.at.kind === 'items',
      ),
    ).toMatchObject({ how: 'names', at: { path: 'items.draught.use' } })
  })

  it('Core: an opened chest gives a strange potion; drunk, it is known first, and heals', () => {
    const options = {
      system: core,
      world: road,
      oracle: createOracleEngine({ registry, random: seeded(1) }),
    }
    const rules = partyOf(core)
    const members = [newMember(rules, { id: 'kael', name: 'Kael' })]
    const { session } = startTrip({ system: core, location: 'a', seed: 'c', time: 9 * 60, members })
    let s: SessionState = settleTrip(options, {
      ...applyResult(session, { effects: { 'present.chest': 1 } }, {}, rules),
      acting: 'kael',
    }).state
    s.present![0].character.values.lock = 0
    s = settleTrip(options, s).state
    const opened = stepTrip(options, s, {
      type: 'action',
      id: 'open-chest',
      with: { chest: 'chest' },
    })
    s = opened.state
    expect(held(s, 'kael')).toContainEqual(['draught', 1, true])
    // Told by what it's held as: the path says it's held unknown.
    expect(opened.entries.map((e) => e.data?.path)).toContain(
      'characters.kael.items.draught.unknown',
    )
    expect(tripFacts(options, s).characters).toMatchObject({
      kael: { items: { draught: { count: 1, unknown: 1, known: 0 } } },
    })
    // Its Use: open to Kael, none for what has no use.
    const key = s.members![0].items!.find((i) => i.id === 'draught')!.key
    expect(useUnavailable(options, s, 'kael', key)).toBe(false)
    s.members![0].values.health = 1
    const drunk = stepTrip(options, s, { type: 'use', who: 'kael', item: key })
    expect(drunk.entries[0]).toMatchObject({
      code: 'ITEM_IDENTIFIED',
      data: { path: 'characters.kael.items.draught', count: 1 },
    })
    // Then its action, the item known: told by what it is, spent by the action's step.
    expect(drunk.entries.find((e) => e.code === 'ACTION_TAKEN')?.data?.params).toEqual({
      item: 'draught',
    })
    expect(drunk.entries.map((e) => e.data?.path)).toContain('characters.kael.items.draught')
    expect(drunk.entries.find((e) => e.code === 'SAID')?.data?.text).toMatchObject({
      en: 'Kael drinks it: 2 health back.',
    })
    s = drunk.state
    expect(s.members![0].values.health).toBe(3)
    expect(held(s, 'kael').filter(([id]) => id === 'draught')).toEqual([])
    // The step begins with the line that said what it was.
    expect(s.lastStep).toBe(Number(drunk.entries[0].id.slice(1)))
  })

  it("the Grey Marches: a flask found unknown, tasted until it's known, then drunk", () => {
    const rules = partyOf(marches)
    const members = [
      newMember(rules, { id: 'kael', name: 'Kael', values: { survival: 3 } }),
      newMember(rules, { id: 'mara', name: 'Mara' }),
    ]
    const options = {
      system: marches,
      world: road,
      oracle: createOracleEngine({ registry, random: seeded(2) }),
    }
    const { session } = startTrip({
      system: marches,
      location: 'a',
      seed: 'f',
      time: 9 * 60,
      members,
    })
    // A chest's _In the chest_ (or the hoard) gives one to whoever of the Company carries things.
    let s = applyResult(session, { effects: { 'party.items.cordial.unknown': 1 } }, {}, rules)
    expect(held(s, 'kael')).toContainEqual(['cordial', 1, true])
    // Taste a flask: shown while one is held unknown, open to whoever acts and holds one.
    expect(tripAvailability(options, s).taste).toMatchObject({ condition: 'needs' })
    expect(tripAvailability(options, { ...s, acting: 'mara' }).taste).toMatchObject({
      condition: 'needs',
    })
    s = { ...s, acting: 'kael' }
    expect(tripAvailability(options, s).taste).toBeUndefined()
    const sips: unknown[] = []
    for (let n = 0; n < 10 && s.members![0].items!.some((i) => i.unknown); n++) {
      const done = stepTrip(options, s, { type: 'action', id: 'taste' })
      s = done.state
      sips.push(...done.entries.filter((e) => e.data?.event === 'table.taste').map(effectsOf))
    }
    expect(sips.at(-1)).toEqual({ 'acting.items.cordial.known': 1 })
    expect(held(s, 'kael')).toContainEqual(['cordial', 1, false])
    expect(tripAvailability(options, s).taste).toMatchObject({ condition: 'when' })
    // Drunk known (its Use): no line to say what it is, the cordial rolled, the flask spent.
    s.party!.values.fatigue = 3
    const key = s.members![0].items!.find((i) => i.id === 'cordial')!.key
    const drunk = stepTrip(options, s, { type: 'use', who: 'kael', item: key })
    expect(drunk.entries.map((e) => e.code)).not.toContain('ITEM_IDENTIFIED')
    const cordial = effectsOf(drunk.entries.find((e) => e.data?.event === 'table.cordial')!)
    expect([{ 'party.stats.fatigue': 1 }, { 'party.stats.fatigue': '=0' }]).toContainEqual(cordial)
    expect(drunk.state.party!.values.fatigue).toBe(cordial['party.stats.fatigue'] === 1 ? 4 : 0)
    expect(held(drunk.state, 'kael').filter(([id]) => id === 'cordial')).toEqual([])
  })

  it('the Grey Marches: one drunk blind joins the known flask, and only one is spent', () => {
    const rules = partyOf(marches)
    const members = [newMember(rules, { id: 'kael', name: 'Kael' })]
    const options = {
      system: marches,
      world: road,
      oracle: createOracleEngine({ registry, random: seeded(3) }),
    }
    const { session } = startTrip({
      system: marches,
      location: 'a',
      seed: 'g',
      time: 9 * 60,
      members,
    })
    // The hedge-witch's cordial, known; a flask from a hoard, not.
    let s = applyResult(
      session,
      { effects: { 'party.items.cordial': 1, 'party.items.cordial.unknown': 1 } },
      {},
      rules,
    )
    expect(held(s, 'kael')).toEqual(
      expect.arrayContaining([
        ['cordial', 1, false],
        ['cordial', 1, true],
      ]),
    )
    const blind = s.members![0].items!.find((i) => i.id === 'cordial' && i.unknown)!.key
    s = stepTrip(options, s, { type: 'use', who: 'kael', item: blind }).state
    expect(held(s, 'kael').filter(([id]) => id === 'cordial')).toEqual([['cordial', 1, false]])
  })

  it('suggests what an item a Use took is, among the items with a Use', () => {
    const s = contextSuggestions(registry)
    expect(s['acting.items[params.item].id']).toEqual(
      expect.arrayContaining(['cordial', 'draught']),
    )
  })

  it('names no action that the system lacks', () => {
    const { registry: broken } = loadPacks([
      ...corePack().map((f) =>
        f.path.endsWith('items.yaml')
          ? { ...f, content: f.content.replace('use: actions.drink', 'use: actions.quaff') }
          : f,
      ),
    ])
    const found = travelSystems(broken).problems.map((p) => p.message)
    expect(found).toContain('the system has no action "actions.quaff"')
  })
})
