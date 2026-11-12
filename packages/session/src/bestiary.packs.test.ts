import { createOracleEngine, loadPacks } from '@open-tabletop/oracle-engine'
import { seeded } from '@open-tabletop/random'
import type { TravelWorld } from '@open-tabletop/travel-engine'
import { describe, expect, it } from 'vitest'
import { corePack, greyMarchesPack } from './core.testing'
import { encounterView, fightStarters } from './encounter'
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
  connections: () => [],
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

  it('the Grey Marches: a traveller who wants an escort pays at Fort Keld, and walks off if refused', () => {
    const rules = partyOf(marches)
    const members = [newMember(rules, { id: 'kael', name: 'Kael' })]
    const road: TravelWorld = {
      km: () => 1,
      place: (id) => ({ terrain: 'plains', danger: 2, tags: id === 'fort' ? ['garrison'] : [] }),
      neighbors: (id) => (id === 'a' ? ['b', 'fort'] : ['a']),
      distance: () => 1,
      connections: () => ['road'],
    }
    const options = { system: marches, world: road }
    const start = () =>
      startTrip({ system: marches, location: 'a', members, seed: 'x', season: 'summer' }).session
    const meeting = () => {
      for (let seed = 1; seed < 500; seed++) {
        const made = createOracleEngine({ registry, random: seeded(seed) }).resolve(
          'grey-marches/table.encounter',
          tripFacts(options, start()),
        ).resolution
        const offer = (made.value.effects as Record<string, unknown> | undefined)?.[
          'party.values.escort-offer'
        ]
        if (made.entry === 'traveller' && offer) return made
      }
      throw new Error('no escort in 500 seeds')
    }
    const met = meeting()
    expect(met.text).toMatch(/^On the way you meet a \S+ who wants an escort to Fort Keld$/)
    let s = applyResult(start(), met.value, marches.bindings?.stats, rules)
    expect(s.present?.[0].character.template?.id).toBe('traveller')
    const values = () => (tripFacts(options, s).party as { values: Record<string, number> }).values
    const offered = values()['escort-offer']
    expect(offered).toBeGreaterThanOrEqual(6)
    const can = () => tripAvailability(options, s).escort
    expect(can()).toBeFalsy()

    // Taken up: the offer is a promise, and the traveller walks with the Company.
    s = stepTrip(options, s, { type: 'action', id: 'escort' }).state
    expect(values()).toMatchObject({ escort: offered, 'escort-offer': 0 })
    expect(s.present).toEqual([])
    const silver = s.stats.silver as number

    // Entering the fort pays it, once.
    const walkTo = (place: string) => {
      s = stepTrip(options, s, { type: 'setDestination', place }).state
      for (let i = 0; i < 8 && s.travel.location !== place; i++) {
        for (const c of s.travel.pendingChecks)
          s = stepTrip(options, s, { type: 'resolveCheck', id: c.id }).state
        s = stepTrip(options, s, { type: 'action', id: 'march', with: { until: 'place' } }).state
      }
      expect(s.travel.location).toBe(place)
    }
    walkTo('fort')
    expect(s.stats.silver).toBe(silver + offered)
    expect(values().escort).toBe(0)

    // Refused: walking on, the traveller is gone and the offer with them.
    s = applyResult(start(), met.value, marches.bindings?.stats, rules)
    walkTo('b')
    expect(s.present).toEqual([])
    expect(values()['escort-offer']).toBe(0)
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

describe('the bundled packs fight in turns', () => {
  const people = (system: typeof marches) => {
    const rules = partyOf(system)
    return [
      newMember(rules, { id: 'kael', name: 'Kael', values: { stealth: 3 } }),
      newMember(rules, { id: 'mara', name: 'Mara', values: { stealth: 0 } }),
    ]
  }
  /** Plays a fight to its end: each companion's turn a Strike one down at the first foe here. */
  function fight(system: typeof marches, start: string, seed: string) {
    const { session } = startTrip({
      system,
      location: 'a',
      members: people(system),
      seed,
      time: 9 * 60,
    })
    const options = {
      system,
      world: heath,
      oracle: createOracleEngine({ registry, random: seeded(2) }),
    }
    let s = applyResult(
      session,
      { effects: { 'present.bandit': 2, 'present.foe': 2 } },
      {},
      partyOf(system),
    )
    const lines: string[] = []
    let done = stepTrip(options, s, { type: 'action', id: start })
    const first = done.state.encounter?.order ?? []
    for (let turn = 0; turn < 60 && done.state.encounter; turn++) {
      lines.push(...done.entries.map((e) => e.code))
      s = done.state
      const foe = s.present!.find((p) => p.at === s.travel.location)!.character.id
      done = stepTrip(options, s, { type: 'action', id: 'strike', with: { foe } })
      // Its ask: who to strike, answered with the one given.
      if (done.state.travel.waiting)
        done = stepTrip(options, done.state, { type: 'resume', choice: foe })
    }
    lines.push(...done.entries.map((e) => e.code))
    return { state: done.state, lines, first }
  }

  it('the Grey Marches: Stand and fight, turns by what each one rolls, foes whose nerve breaks, over when none is left', () => {
    // (The example maps aren't loaded here.)
    expect(problems.filter((p) => !p.at?.includes('.maps.'))).toEqual([])
    expect(marches.encounter?.order).toEqual({
      by: 'participant',
      value: { party: '{{1d6 + acting.values.stealth}}', foes: '{{1d6 + acting.values.harm}}' },
    })
    const { state, lines } = fight(marches, 'stand', 'g')
    expect(lines[0]).toBe('ACTION_TAKEN')
    expect(lines).toContain('ENCOUNTER_STARTED')
    expect(lines.filter((l) => l === 'ENCOUNTER_TURN').length).toBeGreaterThan(2)
    // Kael rolls 1d6 and his Stealth (3), Mara 1d6 and hers (0), each bandit 1d6 and its Harm.
    const order = fight(marches, 'stand', 'g').first
    expect(order).toEqual(['kael', 'bandit-2', 'bandit', 'mara'])
    expect(lines.at(-1)).toBe('ENCOUNTER_ENDED')
    expect(state.encounter).toBeUndefined()
    expect(state.present?.filter((p) => p.at === state.travel.location) ?? []).toEqual([])
    // Rounds of a minute: time went on as the rounds came.
    const rounds = lines.filter((l) => l === 'ENCOUNTER_ROUND').length
    expect(state.travel.time).toBeGreaterThanOrEqual(9 * 60 + rounds - 1)
  })

  it("a foe's nerve breaks on its turn: 2d6 over its Morale and it runs", () => {
    let ran = 0
    for (const seed of ['a', 'b', 'c', 'd', 'e', 'f'])
      ran += fight(marches, 'stand', seed).lines.filter((l) => l === 'PRESENT_LEFT').length
    expect(ran).toBeGreaterThan(0)
  })

  it('Core: Fight, the party first, a Strike on each turn, over when no foe is left', () => {
    expect(core.encounter).toEqual({
      order: { by: 'side', first: 'party' },
      actions: ['strike'],
      ends: { 'present.count': 0 },
    })
    const { state, lines } = fight(core, 'fight', 'c')
    expect(lines.slice(0, 4)).toEqual([
      'ACTION_TAKEN',
      'ENCOUNTER_STARTED',
      'ENCOUNTER_ROUND',
      'ENCOUNTER_TURN',
    ])
    expect(lines.at(-1)).toBe('ENCOUNTER_ENDED')
    expect(state.encounter).toBeUndefined()
  })

  it('both start their fights with an action of their own: Stand and fight, Fight', () => {
    expect(fightStarters(marches.rules)).toEqual(['stand'])
    expect(fightStarters(core.rules)).toEqual(['fight'])
  })

  it('the Grey Marches: a fight started by hand with those here, shown in turns, and called off', () => {
    const { session } = startTrip({
      system: marches,
      location: 'a',
      members: people(marches),
      seed: 'h',
      time: 9 * 60,
    })
    const options = {
      system: marches,
      world: heath,
      oracle: createOracleEngine({ registry, random: seeded(2) }),
    }
    const s = applyResult(session, { effects: { 'present.bandit': 2 } }, {}, partyOf(marches))
    let done = stepTrip(options, s, { type: 'encounter', what: 'start' })
    expect(done.entries.map((e) => e.code)).toContain('ENCOUNTER_STARTED')
    // The panel: round 1, the four in the order rolled, someone's turn.
    const view = encounterView(done.state)!
    expect(view.round).toBe(1)
    expect(view.fighters.map((f) => f.id).sort()).toEqual(['bandit', 'bandit-2', 'kael', 'mara'])
    expect(view.fighters.filter((f) => f.acting)).toHaveLength(1)
    expect(tripAvailability(options, done.state).travel).toEqual({ encounter: 'fight' })
    // A strike asks whom: while it waits, the turn is still that one's.
    const acting = view.fighters.find((f) => f.acting)!.id
    done = stepTrip(options, done.state, { type: 'action', id: 'strike' })
    expect(done.state.travel.waiting?.ask).toBe('foe')
    const waiting = encounterView(done.state)!
    expect(waiting.fighters.find((f) => f.acting)?.id).toBe(acting)
    expect(waiting.fighters.find((f) => f.id === acting)?.done).toBe(false)
    done = stepTrip(options, done.state, { type: 'resume', choice: 'bandit' })
    done = stepTrip(options, done.state, { type: 'encounter', what: 'end' })
    expect(done.entries.map((e) => e.code)).toContain('ENCOUNTER_ENDED')
    expect(done.state.encounter).toBeUndefined()
    expect(encounterView(done.state)).toBeUndefined()
    expect(tripAvailability(options, done.state).travel).toBeUndefined()
  })
})
