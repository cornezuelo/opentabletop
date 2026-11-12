import { createOracleEngine, loadPacks } from '@open-tabletop/oracle-engine'
import { seeded } from '@open-tabletop/random'
import type { TravelWorld } from '@open-tabletop/travel-engine'
import { describe, expect, it } from 'vitest'
import { corePack, greyMarchesPack } from './core.testing'
import { encounterView, fightStarters } from './encounter'
import { applyResult, type JournalEntry } from './index'
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
    const all: JournalEntry[] = []
    let done = stepTrip(options, s, { type: 'action', id: start })
    const first = done.state.encounter?.order ?? []
    for (let turn = 0; turn < 60 && done.state.encounter; turn++) {
      lines.push(...done.entries.map((e) => e.code))
      all.push(...done.entries)
      s = done.state
      const foe = s.present!.find((p) => p.at === s.travel.location)!.character.id
      done = stepTrip(options, s, { type: 'action', id: 'strike', with: { foe } })
      // Its ask: who to strike, answered with the one given.
      if (done.state.travel.waiting)
        done = stepTrip(options, done.state, { type: 'resume', choice: foe })
    }
    lines.push(...done.entries.map((e) => e.code))
    all.push(...done.entries)
    return { state: done.state, lines, first, all }
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
    // Its end is a moment (Mind the mail's), heard last; nobody wears armour here.
    expect(lines.slice(-2)).toEqual(['ENCOUNTER_ENDED', 'MOMENT_REACHED'])
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
      foes: 'table.foe-turn',
      ends: { 'present.count': 0 },
      skip: { 'acting.conditions': 'staggered' },
    })
    const { state, lines } = fight(core, 'fight', 'c')
    expect(lines.slice(0, 5)).toEqual([
      'ACTION_TAKEN',
      'SAID',
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

  it('foes act on their turns: Core’s blow, the Marches’ wolves going for the weakest', () => {
    // Core: each foe's turn rolls the system's table, a blow at one of the party (when a foe
    // still stands by its turn: in some fights the party fells them all first).
    const blows = ['c', 'd', 'e', 'f', 'g'].filter((seed) =>
      fight(core, 'fight', seed).lines.includes('ORACLE_RESULT'),
    )
    expect(blows.length).toBeGreaterThan(0)
    // The Grey Marches: wolves with their leader (without it they run) and a bandit; the
    // wolves roll their own table, the bandit the system's.
    const { session } = startTrip({
      system: marches,
      location: 'a',
      members: people(marches),
      seed: 'w',
      time: 9 * 60,
    })
    const options = {
      system: marches,
      world: heath,
      oracle: createOracleEngine({ registry, random: seeded(3) }),
    }
    let s = applyResult(
      session,
      { effects: { 'present.pack-leader': 1, 'present.grey-wolf': 2, 'present.bandit': 1 } },
      {},
      partyOf(marches),
    )
    // Mara is hurt: the wolves that bite go for her.
    s = {
      ...s,
      members: s.members!.map((m) =>
        m.id === 'mara' ? { ...m, values: { ...m.values, health: 1 } } : m,
      ),
    }
    const tables: unknown[] = []
    const bitten: unknown[] = []
    let done = stepTrip(options, s, { type: 'action', id: 'stand' })
    for (let turn = 0; turn < 12 && done.state.encounter; turn++) {
      for (const e of done.entries)
        if (e.code === 'ORACLE_RESULT') {
          tables.push(e.data?.table)
          const value = e.data?.value as Record<string, unknown>
          if (e.data?.table === 'grey-marches/wolf-turn' && value.target) bitten.push(value.target)
        }
      // The Company strikes the wolves of the pack (not its leader, or they'd run), so the
      // others get their turns.
      const here = done.state.present?.filter((p) => p.at === done.state.travel.location) ?? []
      const foe = (here.find((p) => p.character.id.startsWith('grey-wolf')) ?? here.at(-1))
        ?.character.id
      if (!foe) break
      done = stepTrip(options, done.state, { type: 'action', id: 'strike', with: { foe } })
      if (done.state.travel.waiting)
        done = stepTrip(options, done.state, { type: 'resume', choice: foe })
    }
    expect(tables).toContain('grey-marches/wolf-turn')
    expect(tables).toContain('grey-marches/foe-turn')
    expect(new Set(bitten)).toEqual(new Set(bitten.length ? ['mara'] : []))
  })

  it('the Grey Marches: foes rolled by hand, each turn waiting for the total the player rolled', () => {
    const { session } = startTrip({
      system: marches,
      location: 'a',
      members: people(marches),
      seed: 'w',
      time: 9 * 60,
    })
    const options = {
      system: marches,
      world: heath,
      oracle: createOracleEngine({ registry, random: seeded(3) }),
    }
    const s = applyResult(
      { ...session, foesByHand: true },
      { effects: { 'present.pack-leader': 1, 'present.grey-wolf': 2, 'present.bandit': 1 } },
      {},
      partyOf(marches),
    )
    // The player's dice: a 6 for a wolf (it bites), a 1 for anyone else (it swings and misses).
    const asked: string[] = []
    const rows: string[] = []
    let done = stepTrip(options, s, { type: 'action', id: 'stand' })
    for (let turn = 0; turn < 30 && done.state.encounter; turn++) {
      for (const e of done.entries)
        if (e.code === 'ROLLED')
          for (const r of e.data?.rolls as { source: string; entry?: string; byHand?: true }[])
            if (r.byHand) rows.push(`${r.source}:${r.entry}`)
      const e = done.state.encounter
      if (e.stage === 'rolling') {
        expect(encounterView(done.state)).toMatchObject({ rolling: e.rolling, dice: '1d6' })
        asked.push(e.rolling!)
        const total = e.rolling === 'grey-marches/wolf-turn' ? 5 : 1
        done = stepTrip(options, done.state, { type: 'encounter', what: 'roll', total })
        continue
      }
      const here = done.state.present?.filter((p) => p.at === done.state.travel.location) ?? []
      const foe = (here.find((p) => p.character.id.startsWith('grey-wolf')) ?? here.at(-1))
        ?.character.id
      if (!foe) break
      done = stepTrip(options, done.state, { type: 'action', id: 'strike', with: { foe } })
      if (done.state.travel.waiting)
        done = stepTrip(options, done.state, { type: 'resume', choice: foe })
    }
    expect(asked).toContain('grey-marches/wolf-turn')
    expect(asked).toContain('grey-marches/foe-turn')
    expect(new Set(rows)).toEqual(
      new Set(['grey-marches/wolf-turn:bite', 'grey-marches/foe-turn:miss']),
    )
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

  it('the Grey Marches: falling back, the clumsiest takes a blow from the fiercest; Core says how tough the toughest is', () => {
    const { session } = startTrip({
      system: marches,
      location: 'a',
      members: people(marches),
      seed: 'p',
      time: 9 * 60,
    })
    const options = {
      system: marches,
      world: heath,
      oracle: createOracleEngine({ registry, random: seeded(4) }),
    }
    const s = applyResult(
      session,
      { effects: { 'present.bandit-chief': 1, 'present.bandit': 1 } },
      {},
      partyOf(marches),
    )
    const started = stepTrip(options, s, { type: 'action', id: 'stand' })
    const health = (st: typeof s, id: string) => st.members!.find((m) => m.id === id)!.values.health
    // The chief's Harm (2) is over Mara's Stealth (0): she takes the difference.
    const before = health(started.state, 'mara')
    const back = stepTrip(options, started.state, { type: 'action', id: 'fall-back' })
    expect(back.state.encounter).toBeUndefined()
    expect(health(back.state, 'mara')).toBe(before - 2)
    expect(health(back.state, 'kael')).toBe(health(started.state, 'kael'))

    const { session: trip } = startTrip({
      system: core,
      location: 'a',
      members: people(core),
      seed: 'c',
    })
    const foes = applyResult(trip, { effects: { 'present.foe': 2 } }, {}, partyOf(core))
    const toughest = Math.max(...foes.present!.map((p) => p.character.values.health))
    const said = stepTrip({ ...options, system: core }, foes, { type: 'action', id: 'fight' })
    expect(said.entries.find((e) => e.code === 'SAID')?.data?.text).toMatchObject({
      en: `The toughest of them has ${toughest} health.`,
      es: `El más duro de ellos tiene ${toughest} de salud.`,
    })
  })

  it('the Grey Marches: after a fight, each piece the companion acting wears rolls its wear die', () => {
    const { session } = startTrip({
      system: marches,
      location: 'a',
      members: people(marches),
      seed: 'w',
      time: 9 * 60,
    })
    const options = {
      system: marches,
      world: heath,
      oracle: createOracleEngine({ registry, random: seeded(4) }),
    }
    // Kael acts, wearing two mail shirts: a new one (d8) and a worn one (d4).
    let s = applyResult(
      { ...session, acting: 'kael' },
      { effects: { 'present.bandit': 1, 'characters.kael.items.mail': 1 } },
      {},
      partyOf(marches),
    )
    const kael = s.members!.find((m) => m.id === 'kael')!
    kael.items = [
      ...kael.items!,
      { ...kael.items!.find((i) => i.id === 'mail')!, key: 'mail-2', fields: { wear: 4 } },
    ]
    const worn = (st: typeof s) =>
      st.members!.find((m) => m.id === 'kael')!.items!.filter((i) => i.place === 'body')
    expect(worn(s).map((i) => [i.key, i.fields.wear])).toEqual([
      ['mail', 8],
      ['mail-2', 4],
    ])
    let rolled = 0
    for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) {
      const play = { ...options, oracle: createOracleEngine({ registry, random: seeded(seed) }) }
      s = stepTrip(play, s, { type: 'action', id: 'stand' }).state
      const back = stepTrip(play, s, { type: 'action', id: 'fall-back' })
      const lines = back.entries.filter(
        (e) => e.code === 'ORACLE_RESULT' && e.data?.table === 'grey-marches/wear-and-tear',
      )
      // One roll for each piece worn, each of its own die.
      expect(lines.length).toBe(2)
      rolled += lines.length
      if (worn(back.state).length < 2) {
        // The worn one, ruined at d4, thrown away; the other still a die of its steps.
        expect(worn(back.state).map((i) => i.key)).toEqual(['mail'])
        expect([4, 6, 8]).toContain(worn(back.state)[0].fields.wear)
        return
      }
      s = { ...back.state, travel: { ...back.state.travel } }
    }
    expect(rolled).toBeGreaterThan(0)
    throw new Error('the worn mail was never ruined in eight fights')
  })

  it('Core: a foe’s blow that lands takes the shield of whoever it hits a step down', () => {
    const dented: string[] = []
    for (const [n, seed] of ['c', 'd', 'e', 'f', 'g', 'h'].entries()) {
      const { session } = startTrip({ system: core, location: 'a', members: people(core), seed })
      const options = {
        system: core,
        world: heath,
        oracle: createOracleEngine({ registry, random: seeded(n + 1) }),
      }
      const armed = applyResult(
        session,
        {
          effects: {
            'present.foe': 4,
            'characters.kael.items.shield': 1,
            'characters.mara.items.shield': 1,
          },
        },
        {},
        partyOf(core),
      )
      expect(armed.members!.map((m) => m.items![0].fields.wear)).toEqual([6, 6])
      let done = stepTrip(options, armed, { type: 'action', id: 'fight' })
      for (let turn = 0; turn < 30 && done.state.encounter; turn++) {
        for (const e of done.entries) {
          if (e.code === 'CHANGED' && /items\.shield\.wear$/.test(String(e.data?.path)))
            dented.push(`${e.data?.from}→${e.data?.to}`)
        }
        const foe = done.state.present?.find((p) => p.at === done.state.travel.location)?.character
          .id
        if (!foe) break
        done = stepTrip(options, done.state, { type: 'action', id: 'strike', with: { foe } })
        if (done.state.travel.waiting)
          done = stepTrip(options, done.state, { type: 'resume', choice: foe })
      }
    }
    // A d6 to a d4, and never further: the last of its steps.
    expect(dented).toContain('6→4')
    expect(dented.every((d) => d === '6→4')).toBe(true)
  })

  it("a roll mode on one roll of a generator: Core's contest, the Grey Marches' blow on a lone foe", () => {
    const contest = (edge: boolean) =>
      createOracleEngine({ registry, random: seeded(5) }).resolve('core/generator.contest', {
        edge,
      }).resolution
    // With an edge, yours is rolled twice (one kept, one discarded); theirs once.
    const rolls = (r: ReturnType<typeof contest>) => r.rolls.map((x) => x.discarded?.length ?? 0)
    expect(rolls(contest(true))).toEqual([1, 0])
    expect(rolls(contest(false))).toEqual([0, 0])

    const { session } = startTrip({
      system: marches,
      location: 'a',
      members: people(marches),
      seed: 'b',
      time: 9 * 60,
    })
    const options = {
      system: marches,
      world: heath,
      oracle: createOracleEngine({ registry, random: seeded(6) }),
    }
    const s = applyResult(session, { effects: { 'present.bandit': 1 } }, {}, partyOf(marches))
    const foe = s.present![0].character
    // In a fight, on a companion's turn.
    const fight = stepTrip(options, s, { type: 'action', id: 'stand' })
    const before = fight.state.present!.find((p) => p.character.id === foe.id)!.character
    let done = stepTrip(options, fight.state, {
      type: 'action',
      id: 'strike',
      with: { foe: foe.id },
    })
    if (done.state.travel.waiting)
      done = stepTrip(options, done.state, { type: 'resume', choice: foe.id })
    const rolled = done.entries.find(
      (e) => e.code === 'ROLLED' && e.data?.check === 'generator.blow',
    )
    // Alone, by day: rolled twice, the higher kept, and taken from its health.
    const dice = (rolled?.data?.rolls as { dice: string[] }[])[0].dice[0]
    expect(dice).toMatch(/^1d6 →.*\(/)
    const harm = Number(/→ (\d+)/.exec(dice)![1])
    const left =
      done.state.present?.find((p) => p.character.id === foe.id)?.character.values.health ?? 0
    expect(left).toBe(Math.max(0, before.values.health - harm))
  })

  it("conditions given for a while: Core's staggered foe reels, the Grey Marches' rattled companion; both wear off", () => {
    const texts = (all: JournalEntry[]) => all.map((e) => JSON.stringify(e))
    const seeds = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']
    const core1 = seeds.map((seed) => texts(fight(core, 'fight', seed).all))
    // A glancing 1 staggers a foe (Core's _A strike_), which loses its turn (the system's
    // `skip`); it wears off.
    expect(core1.some((t) => t.some((x) => x.includes('staggers')))).toBe(true)
    expect(core1.some((t) => t.some((x) => x.includes('ENCOUNTER_SKIPPED')))).toBe(true)
    expect(
      core1.some((t) => t.some((x) => x.includes('conditions.staggered') && x.includes('"to":0'))),
    ).toBe(true)
    // A heavy blow rattles a companion for 1d2 rounds; it wears off by itself.
    const marches1 = Array.from({ length: 40 }, (_, i) =>
      texts(fight(marches, 'stand', `m${i}`).all),
    )
    expect(marches1.some((t) => t.some((x) => x.includes('heavy blow')))).toBe(true)
    expect(
      marches1.some((t) => t.some((x) => x.includes('conditions.rattled') && x.includes('"to":0'))),
    ).toBe(true)
  })

  it('the Grey Marches: a wolf drags a companion down, and that one loses their next turn', () => {
    let lost = 0
    for (let n = 1; n <= 30 && !lost; n++) {
      const { session } = startTrip({
        system: marches,
        location: 'a',
        members: people(marches),
        seed: `d${n}`,
        time: 9 * 60,
      })
      const options = {
        system: marches,
        world: heath,
        oracle: createOracleEngine({ registry, random: seeded(n) }),
      }
      const s = applyResult(
        session,
        // Enraged, their nerve never breaks: they bite on every turn.
        {
          effects: {
            'present.pack-leader': 1,
            'present.grey-wolf': 3,
            'present.all.conditions.enraged': true,
          },
        },
        {},
        partyOf(marches),
      )
      let done = stepTrip(options, s, { type: 'action', id: 'stand' })
      const all = [...done.entries]
      for (let turn = 0; turn < 8 && done.state.encounter; turn++) {
        const here = done.state.present?.filter((p) => p.at === done.state.travel.location) ?? []
        const foe = here.find((p) => p.character.id.startsWith('grey-wolf'))?.character.id
        if (!foe) break
        done = stepTrip(options, done.state, { type: 'action', id: 'strike', with: { foe } })
        if (done.state.travel.waiting)
          done = stepTrip(options, done.state, { type: 'resume', choice: foe })
        all.push(...done.entries)
      }
      const dragged = all.findIndex(
        (e) => e.code === 'CHANGED' && String(e.data?.path).endsWith('conditions.dragged-down'),
      )
      if (dragged < 0) continue
      const who = String(all[dragged].data?.path).split('.')[1]
      // That one's next turn is lost, and the condition with it.
      const next = all.slice(dragged).find((e) => e.code === 'ENCOUNTER_TURN' && e.data?.id === who)
      if (!next) continue
      const after = all[all.indexOf(next) + 1]
      expect(after.code).toBe('ENCOUNTER_SKIPPED')
      lost++
    }
    expect(lost).toBe(1)
  })
})
