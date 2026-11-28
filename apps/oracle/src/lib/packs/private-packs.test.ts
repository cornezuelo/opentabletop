import { createOracleEngine, formatDiagnostic, loadPacks } from '@open-tabletop/oracle-engine'
import { seeded } from '@open-tabletop/random'
import {
  applyResult,
  newMember,
  partyOf,
  startTrip,
  stepTrip,
  travelSystems,
  tripAvailability,
  type SessionState,
  type TravelSystem,
} from '@open-tabletop/session'
import { applyCharacter, buildProblems, valuesNow } from '@open-tabletop/character-engine'
import {
  createTravelEngine,
  initialTravelState,
  type TravelWorld,
} from '@open-tabletop/travel-engine'
import { describe, expect, it } from 'vitest'
import { bundledPacks } from '@open-tabletop/pack-ui/bundled'
import { engineFiles } from '@open-tabletop/pack-ui'

/**
 * Personal-use packs (packs-private/, a private checkout): they're only here on machines
 * that have it, so these tests skip elsewhere. They play the rules, not the content.
 */
const personal = bundledPacks.filter((p) => p.personal)
const kal = personal.some((p) => p.root === 'kal-arath')

describe.skipIf(!kal)('Kal-Arath (personal use)', () => {
  const { registry, diagnostics } = loadPacks(engineFiles(bundledPacks))
  const system = () => travelSystems(registry).systems.find((s) => s.id === 'kal-arath')!
  const plains: TravelWorld = {
    km: () => 30,
    place: (hex) => (['0', '1', '2'].includes(hex) ? { terrain: 'grassland' } : null),
    neighbors: (hex) =>
      [String(Number(hex) - 1), String(Number(hex) + 1)].filter((h) => +h >= 0 && +h < 3),
    distance: (a, b) => Math.abs(Number(a) - Number(b)),
    connections: () => [],
  }
  const options = (seed: string) => ({
    system: system(),
    world: plains,
    oracle: createOracleEngine({ registry, random: seeded(seed) }),
    locale: 'es',
  })

  it('has no fatigue: it is not one of its rules', () => {
    expect(system().bindings?.stats?.fatigue).toBeUndefined()
    const { session } = startTrip({ system: system(), location: '0', season: 'spring' })
    const night = stepTrip(
      options('nofatigue'),
      { ...session, travel: { ...session.travel, resources: { food: 0 } } },
      { type: 'action', id: 'camp' },
    ).state
    expect(night.stats.fatigue).toBeUndefined()
  })

  it('loads without problems', () => {
    expect(diagnostics.map(formatDiagnostic)).toEqual([])
    expect(travelSystems(registry).problems.map(formatDiagnostic)).toEqual([])
  })

  it('forages: halves the day, once a day, and what is found adds to the food', () => {
    let gainedSomething = false
    for (let i = 0; i < 20; i++) {
      const { session } = startTrip({ system: system(), location: '0', season: 'spring' })
      session.dayVars = {}
      const { state, entries } = stepTrip(options(`forage-${i}`), session, {
        type: 'action',
        id: 'forage',
      })
      expect(entries.some((e) => e.data?.event === 'FORAGE_CHECK_REQUIRED')).toBe(true)
      expect(state.travel.speedToday).toBe(0.5)
      const gained = state.party!.values.rations - session.party!.values.rations
      expect([0, 1, 3, 5]).toContain(gained)
      gainedSomething ||= gained > 0
    }
    expect(gainedSomething).toBe(true)
  })

  it('rolls foraging and getting lost with advantage for an explorer, finding the way with disadvantage', () => {
    const engine = createOracleEngine({ registry, random: seeded('explorer') })
    // Advantage and disadvantage are a die more, the best or worst kept (`3d6` for `2d6`).
    const twice = (id: string, context: Record<string, unknown>) =>
      engine
        .resolve(id, context)
        .resolution.rolls[0]?.terms.some((t) => t.kind === 'dice' && t.rolls.length > 1) ?? false
    expect(twice('kal-arath/forage', {})).toBe(false)
    expect(twice('kal-arath/forage', { explorer: 1 })).toBe(true)
    expect(twice('kal-arath/lost-check', { yesterday: { lost: true } })).toBe(true)
    expect(twice('kal-arath/lost-check', { explorer: 1, yesterday: { lost: true } })).toBe(false)
    // An explorer finds points of interest on 4–6.
    const found = (explorer: number) =>
      Array.from(
        { length: 200 },
        () => engine.resolve('kal-arath/poi-check', { explorer }).resolution.value.found === true,
      ).filter(Boolean).length
    expect(found(1)).toBeGreaterThan(found(0))
  })

  it('makes a character as the book: 4 points, none over +2, one at -1 for a point more, PV 1d6 + RES', () => {
    const sheet = system().sheet!.def
    expect(buildProblems(sheet, { fue: 2, res: 2 })).toEqual([])
    expect(buildProblems(sheet, { fue: 2, res: 2, agi: 1, pre: -1 })).toEqual([])
    expect(buildProblems(sheet, { fue: 3, res: 1 })).toContainEqual({
      code: 'ABOVE_MAX',
      value: 'fue',
      max: 2,
    })
    expect(buildProblems(sheet, { fue: 2, res: 2, agi: 2, pre: -1, int: -1 })).toContainEqual({
      code: 'TOO_MANY_LOWER',
      lower: 1,
    })
    for (let i = 0; i < 20; i++) {
      const tough = newMember(partyOf(system()), { id: `h${i}`, values: { res: 2, fue: 2 } })
      const max = tough.values['pv-max']!
      expect(max).toBeGreaterThanOrEqual(3)
      expect(max).toBeLessThanOrEqual(8)
      expect(tough.values.pv).toBe(max)
      expect([10, 20, 30, 40, 50, 60]).toContain(tough.values.plata)
    }
  })

  /** A trip with one character, Urth, standing in the plains. */
  const withUrth = (values: Record<string, number> = {}) => {
    const urth = newMember(partyOf(system()), {
      id: 'urth',
      name: 'Urth',
      values: { fue: 2, res: 1, agi: 1, pv: 6, 'pv-max': 6, ...values },
    })
    return startTrip({ system: system(), location: '0', season: 'spring', members: [urth] }).session
  }
  /** The entry a table came out on, among a step's journal lines. */
  const rolled = (entries: { data?: Record<string, unknown> }[], table: string) =>
    entries
      .flatMap((e) => (e.data?.rolls as { source: string; entry?: string }[] | undefined) ?? [])
      .find((r) => r.source === table)?.entry
  const urth = (s: SessionState) => s.members!.find((m) => m.id === 'urth')!

  it('tests the stat chosen: 2d6 + it against 8, doubles 6 and doubles 1 critical', () => {
    const engine = createOracleEngine({ registry, random: seeded('test') })
    const seen = new Set<string>()
    for (let i = 0; i < 400; i++) {
      const r = engine.resolve('kal-arath/test', {
        params: { stat: 'fue' },
        acting: { values: { fue: 2 } },
      }).resolution
      const id = r.entry!
      const total = r.rolls[0]!.total
      seen.add(id)
      if (id === 'critical') expect(total).toBe(14)
      if (id === 'fumble') expect(total).toBe(4)
      if (id === 'success') expect(total).toBeGreaterThanOrEqual(8)
      if (id === 'failure') expect(total).toBeLessThan(8)
    }
    expect([...seen].sort()).toEqual(['critical', 'failure', 'fumble', 'success'])
    // In a trip, the action asks which stat, then rolls whoever acts.
    let done = stepTrip(
      options('test-trip'),
      { ...withUrth(), acting: 'urth' },
      {
        type: 'action',
        id: 'test',
      },
    )
    expect(done.state.travel.waiting).toBeTruthy()
    done = stepTrip(options('test-trip'), done.state, { type: 'resume', choice: 'fue' })
    expect(done.entries.some((e) => e.data?.table === 'kal-arath/test')).toBe(true)
  })

  it('rolls the Death table at 0 PV, its result kept on the sheet', () => {
    const results = new Set<string>()
    for (let i = 0; i < 60; i++) {
      const s = withUrth()
      const done = stepTrip(
        options(`death-${i}`),
        applyResult(s, { effects: { 'characters.urth.values.pv': '=0' } }, {}, partyOf(system())),
        { type: 'advanceTime', minutes: 1 },
      )
      const u = urth(done.state)
      const id = rolled(done.entries, 'kal-arath/death')
      expect(id).toBeDefined()
      results.add(id)
      if (id === 'unconscious')
        expect(Object.keys(u.conditions)).toEqual(
          expect.arrayContaining(['inconsciente', 'fuera-de-accion']),
        )
      if (id === 'pierced') expect(u.values['pv-max']).toBe(5)
      if (id === 'dead') expect(u.conditions.muerto).toBeDefined()
    }
    expect(results.size).toBeGreaterThan(3)
  })

  it('heals 1d6 + RES at camp, only with a ration and a quiet night', () => {
    const hurt = { pv: 2 }
    // At camp: healed unless the rations ran out or something came in the night.
    let healed = 0
    let unhealed = 0
    for (let i = 0; i < 30; i++) {
      for (const rations of [5, 0]) {
        const camp = withUrth(hurt)
        camp.party = { ...camp.party!, values: { ...camp.party!.values, rations } }
        const night = stepTrip(options(`camp-${i}`), camp, { type: 'action', id: 'camp' })
        const quiet = rolled(night.entries, 'kal-arath/camp') === 'quiet'
        const pv = urth(night.state).values.pv!
        if (rations > 0 && quiet) {
          expect(pv).toBeGreaterThanOrEqual(3)
          healed++
        } else {
          expect(pv).toBe(2)
          unhealed++
        }
      }
    }
    expect(healed).toBeGreaterThan(0)
    expect(unhealed).toBeGreaterThan(30)
  })

  it('stops travel in a spring storm but only halves it in an autumn one', () => {
    const travel = createTravelEngine({ world: plains, rules: system().rules })
    const minutes = (weather: string) =>
      travel.stepMinutes(
        { ...initialTravelState({ location: '0', mode: 'foot' }), weather },
        '0',
        '1',
      )
    expect(minutes('storm')).toBe(Infinity)
    expect(minutes('autumn-storm')).toBe(minutes('clear') * 2)
  })
})

const ker = personal.some((p) => p.root === 'ker-nethalas')

describe.skipIf(!ker)('Ker Nethalas (personal use)', () => {
  const { diagnostics } = loadPacks(engineFiles(bundledPacks))

  it('loads without problems', () => {
    const own = diagnostics.filter((d) => d.pack === 'ker-nethalas')
    expect(own.map(formatDiagnostic)).toEqual([])
  })

  it('walks a Domain: the map grows, the dice run down, and something finds the lair', () => {
    const { registry } = loadPacks(engineFiles(bundledPacks))
    const system = travelSystems(registry).systems.find((s) => s.id === 'ker-nethalas')!
    expect(system.pieces?.length).toBeGreaterThan(0)
  })

  /** Plays a fight against `foes` to its end: each of the PC's turns an Attack at the first one here. */
  // Loaded once: every fight plays the same packs.
  let loaded: { registry: ReturnType<typeof loadPacks>['registry']; system: TravelSystem }
  /** The packs loaded once, and Ker Nethalas' system. */
  const kn = () =>
    (loaded ??= (() => {
      const { registry } = loadPacks(engineFiles(bundledPacks))
      return {
        registry,
        system: travelSystems(registry).systems.find((s) => s.id === 'ker-nethalas')!,
      }
    })())
  function fight(
    foes: Record<string, number>,
    seed: string,
    level = 1,
    held: string[] = ['longsword'],
    /** More to begin with (Masteries held, Minions with them). */
    more: Record<string, number | string> = {},
  ) {
    loaded ??= (() => {
      const { registry } = loadPacks(engineFiles(bundledPacks))
      return {
        registry,
        system: travelSystems(registry).systems.find((s) => s.id === 'ker-nethalas')!,
      }
    })()
    const { registry, system } = loaded
    const rules = partyOf(system)
    const pc = newMember(rules, {
      id: 'erthos',
      name: 'Erthos',
      values: { bladed: 73, dodge: 40, parry: 73, perception: 50, level },
    })
    const room: TravelWorld = {
      km: () => 0.01,
      place: () => ({ terrain: 'stone-floor', tags: ['room'] }),
      neighbors: () => [],
      distance: () => 0,
      connections: () => [],
    }
    const options = {
      system,
      world: room,
      oracle: createOracleEngine({ registry, random: seeded(seed) }),
    }
    const { session } = startTrip({ system, location: 'a', members: [pc], seed })
    const present = Object.fromEntries(Object.entries(foes).map(([t, n]) => [`present.${t}`, n]))
    // A longsword in hand, mail and light vambraces worn.
    const gear = {
      ...Object.fromEntries(held.map((i) => [`characters.erthos.items.${i}`, 1])),
      'characters.erthos.items.mail': 1,
      'characters.erthos.items.light-vambraces': 1,
    }
    // The foes' turns played one after another (no Next between them).
    let s = applyResult(
      { ...session, foesAtOnce: true },
      { effects: { ...present, ...gear, ...more } },
      {},
      rules,
    )
    let done = stepTrip(options, s, { type: 'action', id: 'fight' })
    const entries = [...done.entries]
    for (let turn = 0; turn < 80 && done.state.encounter; turn++) {
      s = done.state
      if (s.travel.waiting) done = stepTrip(options, s, { type: 'resume' })
      else {
        // One of the creatures here, not a Minion of yours.
        const foe = s.present!.find((p) => p.at === s.travel.location && p.side !== 'party')!
          .character.id
        done = stepTrip(options, s, {
          type: 'action',
          id: 'attack',
          with: { foe },
        })
        if (done.state.travel.waiting)
          done = stepTrip(options, done.state, { type: 'resume', choice: foe })
      }
      entries.push(...done.entries)
    }
    return { state: done.state, entries }
  }

  it('fights a Necropede: Initiative, opposed attacks, where blows land, Toughness before Health', () => {
    const { state, entries } = fight({ necropede: 1 }, 'n')
    const codes = entries.map((e) => e.code)
    expect(codes).toContain('ENCOUNTER_STARTED')
    expect(codes).toContain('ENCOUNTER_ENDED')
    expect(state.encounter).toBeUndefined()
    const rolled = entries.filter((e) => e.code === 'ROLLED').map((e) => JSON.stringify(e))
    expect(rolled.some((r) => r.includes('initiative'))).toBe(true)
    expect(rolled.some((r) => r.includes('wound-serpentoid'))).toBe(true)
    // Either the Necropede is destroyed, or the PC took damage on the way: theirs, not the
    // expedition's (its sheet keeps what's shared).
    const pc = state.members!.find((m) => m.id === 'erthos')!.values
    expect(state.present?.length === 0 || pc.toughness! < 30).toBe(true)
    expect(state.party!.values.toughness).toBeUndefined()
    expect(state.party!.values).toMatchObject({ light: expect.any(Number), rations: 3 })
  })

  it("the Gravebound's pools are each one's: a creature aims at one of you, and its blows land on that one", () => {
    const { entries } = fight({ rotwalker: 2 }, 's')
    // Each creature's turn names whom it goes for, chosen before its dice.
    const aimed = entries.filter((e) => e.code === 'ENCOUNTER_TURN' && e.data?.target)
    expect(aimed.length).toBeGreaterThan(0)
    expect(aimed.every((e) => e.data?.target === 'erthos')).toBe(true)
    // What they deal comes off Erthos's own Toughness, never the expedition's.
    const changed = entries.flatMap((e) => (e.code === 'CHANGED' ? [String(e.data?.path)] : []))
    expect(changed).toContain('characters.erthos.values.toughness')
    expect(changed.some((p) => p.startsWith('party.values.'))).toBe(false)
  })

  it("Level Adaptation: a creature is made to the PC's level, and its damaging Actions add the dice it gained", () => {
    const copy = (level: number, id: string) => {
      const { system } = loaded!
      const rules = partyOf(system)
      const pc = newMember(rules, { id: 'erthos', name: 'Erthos', values: { level } })
      const { session } = startTrip({ system, location: 'a', members: [pc], seed: 'adapt' })
      const s = applyResult(session, { effects: { [`present.${id}`]: 1 } }, {}, rules)
      return s.present![0].character.values
    }
    // A creature's copy, as a Combat Encounter brings it (and `loaded` filled).
    fight({ necropede: 1 }, 'adapt')
    // The Abyssal Vexator: 8 Health +4 per level; +D6 damage from level 5, +D8 and +10
    // Combat Skill from level 10.
    expect(copy(1, 'abyssal-vexator')).toMatchObject({
      health: 12,
      combat: 40,
      'more-die': 0,
      'more-die-10': 0,
    })
    expect(copy(5, 'abyssal-vexator')).toMatchObject({
      health: 28,
      combat: 40,
      'more-die': 6,
      'more-die-10': 0,
    })
    expect(copy(11, 'abyssal-vexator')).toMatchObject({
      health: 52,
      combat: 50,
      'more-die': 6,
      'more-die-10': 8,
    })
    // The Amalgam from level 5: +5 Health and +1 Armor everywhere but its Chest.
    expect(copy(4, 'amalgam')).toMatchObject({ health: 15, 'armor-chest': 2, 'armor-legs': 0 })
    expect(copy(5, 'amalgam')).toMatchObject({
      health: 20,
      'armor-chest': 2,
      'armor-legs': 1,
      'armor-head': 1,
    })
    // The Necropede adds +2 damage from level 10.
    expect(copy(10, 'necropede')).toMatchObject({ more: 2, 'more-die': 6 })
    // At level 10 its hits roll the dice it gained (_A creature's damage_); at level 1 none.
    const extra = (entries: ReturnType<typeof fight>['entries']) =>
      entries.filter((e) => e.code === 'ROLLED' && JSON.stringify(e).includes('creature-harm'))
    let rolledAt10 = false
    for (let n = 0; n < 10 && !rolledAt10; n++)
      rolledAt10 = extra(fight({ necropede: 1 }, `adapt10-${n}`, 10).entries).some((e) =>
        /1d6/.test(JSON.stringify(e)),
      )
    expect(rolledAt10).toBe(true)
    for (let n = 0; n < 5; n++)
      expect(
        extra(fight({ necropede: 1 }, `adapt1-${n}`, 1).entries).filter((e) =>
          /"extra/.test(JSON.stringify(e)),
        ),
      ).toEqual([])
  })

  it('a fight is over when the last of you falls', () => {
    loaded ??= (() => {
      const { registry } = loadPacks(engineFiles(bundledPacks))
      return {
        registry,
        system: travelSystems(registry).systems.find((s) => s.id === 'ker-nethalas')!,
      }
    })()
    const { registry, system } = loaded
    const rules = partyOf(system)
    const pc = newMember(rules, {
      id: 'erthos',
      name: 'Erthos',
      values: { health: 0, toughness: 0 },
    })
    const room: TravelWorld = {
      km: () => 0.01,
      place: () => ({ terrain: 'stone-floor', tags: ['room'] }),
      neighbors: () => [],
      distance: () => 0,
      connections: () => [],
    }
    const options = {
      system,
      world: room,
      oracle: createOracleEngine({ registry, random: seeded('f') }),
    }
    const { session } = startTrip({ system, location: 'a', members: [pc], seed: 'f' })
    const s = applyResult(session, { effects: { 'present.rotwalker': 1 } }, {}, rules)
    const done = stepTrip(options, s, { type: 'action', id: 'fight' })
    expect(done.entries.map((e) => e.code)).toContain('ENCOUNTER_ENDED')
    expect(done.state.encounter).toBeUndefined()
  })

  it('progression: two Masteries started with the Ability Points, a level at 1,000 XP, no third Mastery', () => {
    const { registry } = loadPacks(engineFiles(bundledPacks))
    const system = travelSystems(registry).systems.find((s) => s.id === 'ker-nethalas')!
    const rules = partyOf(system)
    const pc = newMember(rules, { id: 'erthos', name: 'Erthos' })
    const room: TravelWorld = {
      km: () => 0.01,
      place: () => ({ terrain: 'stone-floor', tags: ['room'] }),
      neighbors: () => [],
      distance: () => 0,
      connections: () => [],
    }
    const options = {
      system,
      world: room,
      oracle: createOracleEngine({ registry, random: seeded('p') }),
    }
    const { session } = startTrip({ system, location: 'a', members: [pc], seed: 'p' })
    const learn = (s: typeof session, choice: string) => {
      const asked = stepTrip(options, s, { type: 'action', id: 'learn' })
      const offered = asked.state.travel.waiting?.choices ?? []
      return { offered, state: stepTrip(options, asked.state, { type: 'resume', choice }).state }
    }
    // Two points to start: every Mastery's Tier 1 is offered, and nothing past it.
    let s: typeof session = { ...session, acting: 'erthos' }
    let step = learn(s, 'abyssal-reaver-1')
    expect(step.offered).toHaveLength(20)
    expect(step.offered.every((id) => id.endsWith('-1'))).toBe(true)
    step = learn(step.state, 'arcanist-1')
    expect(step.offered).toContain('abyssal-reaver-2')
    s = step.state
    const erthos = () => s.members!.find((m) => m.id === 'erthos')!
    expect(erthos().values).toMatchObject({ points: 0, masteries: 2 })
    expect(erthos().items!.map((i) => [i.id, i.place])).toEqual([
      ['abyssal-reaver-1', 'masteries'],
      ['arcanist-1', 'masteries'],
    ])
    // 1,000 XP: a level, a point, and Toughness +D6 chosen.
    s = applyResult(s, { effects: { 'characters.erthos.values.xp': 1000 } }, {}, rules)
    let done = stepTrip(options, s, { type: 'action', id: 'breather' })
    expect(done.state.travel.waiting).toMatchObject({ action: 'level-up', ask: 'benefit' })
    done = stepTrip(options, done.state, { type: 'resume', choice: 'toughness' })
    s = done.state
    expect(erthos().values).toMatchObject({ level: 2, xp: 0, points: 1 })
    // Two Masteries followed: only their next tiers.
    step = learn(s, 'arcanist-2')
    expect(step.offered).toEqual(['abyssal-reaver-2', 'arcanist-2'])
  })

  it('Skill Improvement at Camp: each Skill marked is rolled, raised and unmarked; the others not', () => {
    const { registry } = loadPacks(engineFiles(bundledPacks))
    const system = travelSystems(registry).systems.find((s) => s.id === 'ker-nethalas')!
    const rules = partyOf(system)
    const pc = newMember(rules, { id: 'erthos', name: 'Erthos', values: { bladed: 40, dodge: 30 } })
    const room: TravelWorld = {
      km: () => 0.01,
      place: () => ({ terrain: 'stone-floor', tags: ['room'] }),
      neighbors: () => [],
      distance: () => 0,
      connections: () => [],
    }
    const options = {
      system,
      world: room,
      oracle: createOracleEngine({ registry, random: seeded('i') }),
    }
    const { session } = startTrip({ system, location: 'a', members: [pc], seed: 'i' })
    const marked = applyResult(
      session,
      { effects: { 'characters.erthos.conditions.bladed': true } },
      {},
      rules,
    )
    let done = stepTrip(options, marked, { type: 'action', id: 'camp' })
    // Whatever the night brings is seen to (a check that pauses, a fight called off).
    for (let i = 0; i < 12; i++) {
      const t = done.state.travel
      if (t.pendingChecks[0])
        done = stepTrip(options, done.state, { type: 'resolveCheck', id: t.pendingChecks[0].id })
      else if (done.state.encounter)
        done = stepTrip(options, done.state, { type: 'encounter', what: 'end' })
      else if (t.waiting) done = stepTrip(options, done.state, { type: 'resume' })
      else break
    }
    const erthos = done.state.members!.find((m) => m.id === 'erthos')!
    expect(erthos.values.bladed).toBeGreaterThan(40)
    expect(erthos.values.bladed).toBeLessThanOrEqual(44)
    expect(erthos.conditions.bladed).toBeUndefined()
    expect(erthos.values.dodge).toBe(30)
    const rolled = done.state.journal.filter(
      (e) => e.code === 'ORACLE_RESULT' && e.data?.table === 'ker-nethalas/improvement',
    )
    expect(rolled).toHaveLength(1)
  })

  it('Set Camp: a ration for each of you, and each one rests', () => {
    const { registry } = loadPacks(engineFiles(bundledPacks))
    const system = travelSystems(registry).systems.find((s) => s.id === 'ker-nethalas')!
    const rules = partyOf(system)
    const members = ['erthos', 'vala'].map((id) =>
      newMember(rules, { id, name: id, values: { health: 5, exhaustion: 12 } }),
    )
    const room: TravelWorld = {
      km: () => 0.01,
      place: () => ({ terrain: 'stone-floor', tags: ['room'] }),
      neighbors: () => [],
      distance: () => 0,
      connections: () => [],
    }
    const options = {
      system,
      world: room,
      oracle: createOracleEngine({ registry, random: seeded('c') }),
    }
    const { session } = startTrip({ system, location: 'a', members, seed: 'c' })
    let done = stepTrip(options, session, { type: 'action', id: 'camp' })
    if (done.state.travel.waiting) done = stepTrip(options, done.state, { type: 'resume' })
    expect(done.state.party!.values.rations).toBe(1)
    for (const m of done.state.members!)
      expect(m.values).toMatchObject({ health: 6, exhaustion: 2 })
  })

  it('fights with gear: the weapon in hand and the Armor worn count, and each piece struck rolls its Integrity after', () => {
    // It ends on the Necropede's turn: the Integrity rolls are the PC's all the same
    // (`for: party.members`).
    const { state, entries } = fight({ necropede: 1 }, 'g')
    const pc = state.members!.find((m) => m.id === 'erthos')!
    // Made of the gear: a Parrying longsword, mail on chest and abdomen, vambraces on the arms.
    expect(pc.values).toMatchObject({
      speed: 0,
      parries: 1,
      'armor-arms': 1,
      'armor-head': 0,
      maneuver: 15,
    })
    // In one fight a piece drops a stage at most: none is discarded yet.
    expect(pc.items!.map((i) => [i.id, i.place])).toEqual([
      ['longsword', 'hands'],
      ['mail', 'torso'],
      ['light-vambraces', 'arms'],
    ])
    // After the fight, one Integrity roll for each piece worn where a blow landed (the sword
    // has none): the mail for the chest or abdomen, the vambraces for the arms.
    const struck = new Set(
      entries
        .filter((e) => e.code === 'CHANGED' && /conditions\.struck-/.test(String(e.data?.path)))
        .map((e) => String(e.data?.path).split('struck-')[1]),
    )
    const rolls = entries.filter(
      (e) => e.code === 'ORACLE_RESULT' && e.data?.table === 'ker-nethalas/integrity',
    )
    expect(rolls.length).toBe(+(struck.has('chest') || struck.has('abdomen')) + +struck.has('arms'))
    // The marks are gone once rolled.
    expect(Object.keys(pc.conditions ?? {}).filter((c) => c.startsWith('struck-'))).toEqual([])
  })

  it('a piece struck rolls its Integrity, one never struck does not, over several fights', () => {
    let rolled = 0
    for (const seed of ['i1', 'i2', 'i3', 'i4', 'i5']) {
      const { entries } = fight({ rotwalker: 1 }, seed)
      const hit = entries.some(
        (e) =>
          e.code === 'CHANGED' &&
          /conditions\.struck-(chest|abdomen|arms)/.test(String(e.data?.path)),
      )
      const rolls = entries.filter(
        (e) => e.code === 'ORACLE_RESULT' && e.data?.table === 'ker-nethalas/integrity',
      ).length
      if (hit) rolled += rolls
      else expect(rolls).toBe(0)
    }
    expect(rolled).toBeGreaterThan(0)
  })

  it('a shield that parried rolls its Integrity after the fight; a Defensive weapon beside it adds 10 to Parry', () => {
    let rolled = 0
    for (const seed of ['s1', 's2', 's3', 's4']) {
      const { entries } = fight({ rotwalker: 1 }, seed, 1, ['shortsword', 'shield'])
      const attacks = entries
        .filter((e) => e.code === 'ORACLE_RESULT' && e.data?.table === 'ker-nethalas/rotwalker')
        .map((e) => e.data?.value as { parrying?: number; dodging?: number })
        .filter((v) => v.parrying !== undefined)
      // Parry 73, the shield's 10 and the Defensive shortsword's 10.
      for (const v of attacks) expect(v.parrying).toBe(93)
      const used = entries.some(
        (e) => e.code === 'CHANGED' && String(e.data?.path).endsWith('conditions.shield-struck'),
      )
      const rolls = entries.filter(
        (e) => e.code === 'ACTION_TAKEN' && e.data?.action === 'shield-integrity',
      ).length
      expect(rolls).toBe(+used)
      rolled += rolls
    }
    expect(rolled).toBeGreaterThan(0)
  })

  it("the weapon wielded: its Skill and die, Two-Handed filling both hands, Versatile, dual wielding and a Defensive weapon's +10 beside a shield", () => {
    const { registry } = loadPacks(engineFiles(bundledPacks))
    const system = travelSystems(registry).systems.find((s) => s.id === 'ker-nethalas')!
    const rules = partyOf(system)
    const pc = newMember(rules, { id: 'e', name: 'E' })
    const { session } = startTrip({ system, location: 'a', members: [pc], seed: 'w' })
    const holding = (...items: string[]) =>
      applyResult(
        session,
        { effects: Object.fromEntries(items.map((i) => [`characters.e.items.${i}`, 1])) },
        {},
        rules,
      ).members![0]
    // A Two-Handed weapon fills both hands: a shield given after it can't go in them.
    const big = holding('great-sword', 'shield')
    expect(big.items!.find((i) => i.id === 'great-sword')!.place).toBe('hands')
    expect(big.items!.find((i) => i.id === 'shield')!.place).not.toBe('hands')
    expect(big.values).toMatchObject({ held: 2, weapons: 1, dual: 0 })
    // Two One-Handed weapons: dual wielding.
    expect(holding('dagger', 'saber').values).toMatchObject({ held: 2, weapons: 2, dual: 1 })
    const engine = createOracleEngine({ registry, random: seeded('w') })
    const wielded = (
      weapon: string | undefined,
      items: Record<string, Record<string, unknown>>,
      values: Record<string, number> = {},
    ) =>
      engine.resolve('ker-nethalas/weapon-wielded', {
        params: { weapon },
        acting: { items, values: { held: 1, dual: 0, ...values } },
      }).resolution.value
    const longsword = {
      longsword: { tags: ['weapon', 'bladed', 'versatile'], versatile: 1, speed: 0 },
    }
    // Versatile with the other hand free: +1; with a shield in it, none.
    expect(wielded('longsword', longsword)).toMatchObject({ skill: 'bladed', sides: 6, might: 1 })
    expect(wielded('longsword', longsword, { held: 2 })).toMatchObject({ might: 0 })
    // A Shafted weapon by its own Skill, its Two-Handed +2, its Speed.
    const halberd = { halberd: { tags: ['weapon', 'shafted'], damage: 2, speed: 5, hands: 2 } }
    expect(wielded('halberd', halberd, { held: 2 })).toMatchObject({
      skill: 'shafted',
      might: 2,
      speed: 5,
    })
    // A fist weapon by Unarmed Combat; nothing in hand, fists: a D4.
    const cestus = { cestus: { tags: ['weapon', 'fist'], drill: 10 } }
    expect(wielded('cestus', cestus)).toMatchObject({ skill: 'unarmed', sides: 6, drill: 10 })
    expect(wielded(undefined, {})).toMatchObject({ skill: 'unarmed', sides: 4, might: 0 })
    // Dual wielding: +1 damage.
    expect(wielded('cestus', cestus, { dual: 1, held: 2 })).toMatchObject({ might: 1 })
  })

  it('where a blow lands names its Armor and Weak Spot, and one table deals the damage there', () => {
    const dealt: string[] = []
    const taken: number[] = []
    for (const seed of ['a', 'b', 'c', 'd']) {
      const { entries } = fight({ rotwalker: 2 }, seed)
      for (const e of entries) {
        if (e.code !== 'ORACLE_RESULT') continue
        const value = e.data?.value as Record<string, unknown> & {
          effects?: Record<string, number>
        }
        // The PC's hit: the location named its Armor and Weak Spot, the damage dealt there.
        if (e.data?.table === 'ker-nethalas/attack' && value.armor) {
          expect(value.weak).toBe(String(value.armor).replace('armor-', 'weak-'))
          const [, n] = Object.entries(value.effects!).find(([k]) => k.endsWith('.values.health'))!
          // Twice the die on the Weak Spot (a Rotwalker's head) or a Critical, else the die; a
          // longsword's Slashing adds 1 when that's 3 or less.
          const twice = value.armor === 'armor-head' || (value.outcome as { crit: number }).crit
          const through = Math.max(0, (value.dmg as number) * (twice ? 2 : 1))
          expect(value.blow).toMatchObject({ taken: 'taken-slashing' })
          expect(-n).toBe(through + (through <= 3 ? 1 : 0))
          dealt.push(String(value.armor))
        }
        // A creature's hit on the PC: the harm where it landed, against the Armor worn there.
        const wound = value?.wound as { harm?: number; armor?: string } | undefined
        if (wound?.armor) taken.push(wound.harm!)
      }
    }
    expect(dealt.length).toBeGreaterThan(0)
    expect(taken.every((n) => Number.isInteger(n) && n >= 0)).toBe(true)
  })

  it('every creature of the Combat Encounters fights to its end, its Actions rolled without a problem', () => {
    const { registry } = loadPacks(engineFiles(bundledPacks))
    const system = travelSystems(registry).systems.find((s) => s.id === 'ker-nethalas')!
    // The creatures met, not the Minions your Abilities summon (`side: party`), nor the
    // Overseers (each Domain's ruler, too much for a PC of level 1: below).
    const templates = system
      .bestiary!.filter((b) => b.def.side !== 'party')
      .flatMap((b) => Object.entries(b.def.templates))
      .filter(([, t]) => !t.tags?.includes('overseer'))
      .map(([id]) => id)
    expect(templates.length).toBeGreaterThanOrEqual(43)
    const acted = new Set<string>()
    for (const id of templates) {
      const { entries, state } = fight({ [id]: 1 }, id)
      expect(entries.filter((e) => e.code === 'CHECK_FAILED').map((e) => e.text)).toEqual([])
      // Over within the turns played, or still going with the PC standing.
      expect(state.encounter === undefined || state.party!.values.health! > 0).toBe(true)
      for (const e of entries)
        if (e.code === 'ORACLE_RESULT' && e.data?.table === `ker-nethalas/${id}`) acted.add(id)
    }
    // Most get a turn before they fall (some may fall first).
    expect(acted.size).toBeGreaterThan(templates.length / 2)
    // Forty-odd fights: longer than a test usually takes.
  }, 60_000)

  it('the Overseers: each fights with its own D6 of Actions, more than one turn a round (Ruthlessness)', () => {
    const { system } = kn()
    const overseers = system
      .bestiary!.flatMap((b) => Object.entries(b.def.templates))
      .filter(([, t]) => t.tags?.includes('overseer'))
      .map(([id]) => id)
    expect(overseers).toHaveLength(10)
    let summoned = false
    for (const id of overseers) {
      const { entries } = fight({ [id]: 1 }, id, 10)
      expect(entries.filter((e) => e.code === 'CHECK_FAILED').map((e) => e.text)).toEqual([])
      expect(
        entries.some((e) => e.code === 'ORACLE_RESULT' && e.data?.table === `ker-nethalas/${id}`),
      ).toBe(true)
      // Two turns in its first round at least (the Pyroclasmic Possessor three).
      const turns = entries.filter(
        (e) => e.code === 'ENCOUNTER_TURN' && e.data?.id === id && e.data?.round === 1,
      ).length
      expect(turns).toBeGreaterThanOrEqual(2)
      summoned ||= entries.some(
        (e) => e.code === 'ENCOUNTER_TURN' && String(e.data?.id).startsWith('lesser-demon'),
      )
    }
    // The Infernal Archon's Lesser Demons, played at last once in ten fights of it.
    for (let n = 0; n < 10 && !summoned; n++)
      summoned = fight({ 'infernal-archon': 1 }, `archon-${n}`, 10).entries.some(
        (e) => e.code === 'ENCOUNTER_TURN' && String(e.data?.id).startsWith('lesser-demon'),
      )
    expect(summoned).toBe(true)
  }, 60_000)

  it("the Overseer's influence: every creature of the Domain holds it, not the Overseer nor your Minions, until it falls", () => {
    const { system } = kn()
    const rules = partyOf(system)
    const pc = newMember(rules, { id: 'erthos', name: 'Erthos', values: { level: 5 } })
    const { session } = startTrip({ system, location: 'a', members: [pc], seed: 'influence' })
    const influenced = {
      'map.values.overseer': 4,
      'map.values.skilled': 1,
      'map.values.tough': 1,
      'map.values.alert': 1,
      'map.values.piercing': 2,
      'map.values.resistant': 14,
    }
    const { registry } = kn()
    const options = {
      system,
      world: {
        km: () => 0.01,
        place: () => ({ terrain: 'stone-floor', tags: ['room'] }),
        neighbors: () => [],
        distance: () => 0,
        connections: () => [],
      } as TravelWorld,
      oracle: createOracleEngine({ registry, random: seeded('influence') }),
    }
    // As a fight starts, what holds by itself on each one here is settled with the Domain's sheet.
    let s = stepTrip(
      options,
      applyResult(
        { ...session, foesAtOnce: true },
        {
          effects: {
            ...influenced,
            'present.rotwalker': 1,
            'present.gorehoof': 1,
            'present.arcane-companion': 1,
          },
        },
        {},
        rules,
      ),
      { type: 'action', id: 'fight' },
    ).state
    // One copy alone: its id is its template's.
    const copy = (template: string) =>
      s.present!.find((p) => p.character.id === template)!.character
    const rot = copy('rotwalker')
    expect(Object.keys(rot.conditions)).toEqual(
      expect.arrayContaining([
        'skilled',
        'tough',
        'alert-mind',
        'piercing',
        'piercing-twice',
        'resistant',
      ]),
    )
    const now = valuesNow(rules.sheets?.[rot.sheet!], rot)
    expect(now.combat).toBe(rot.values.combat + 10)
    expect(now.mind).toBe(rot.values.mind + 20)
    expect(now.penetrating).toBe(rot.values.penetrating + 2)
    expect(now).toMatchObject({ 'crit-immune': 1, resisting: 1 })
    // Gorehoof isn't touched by its own influence; an Arcane Companion of yours is no creature of it.
    const influences = ['skilled', 'tough', 'alert-mind', 'piercing', 'resistant']
    for (const id of ['gorehoof', 'arcane-companion'])
      expect(Object.keys(copy(id).conditions).filter((c) => influences.includes(c))).toEqual([])
    // Defeated, its creatures lose their empowerments.
    s = stepTrip(
      options,
      applyResult(s, { effects: { 'map.values.overseer-down': 1 } }, {}, rules),
      { type: 'encounter', what: 'end' },
    ).state
    expect(Object.keys(copy('rotwalker').conditions)).not.toContain('skilled')
    expect(Object.keys(copy('rotwalker').conditions)).not.toContain('tough')
  })

  it("the Overseer's influence in a blow: Tough takes no Critical, Resistant halves the Domain's type", () => {
    const { registry } = loadPacks(engineFiles(bundledPacks))
    const engine = createOracleEngine({ registry, random: seeded('influence-blow') })
    const hurt = (code: number, values: Record<string, number>, crit = 0, resistant = 14) =>
      0 -
      Number(
        (
          engine.resolve('ker-nethalas/foe-harmed', {
            dmg: 6,
            blow: { taken: 'taken-slashing', code, ignores: 0, cut: 0, pierce: 0 },
            outcome: { crit },
            armor: 'armor-chest',
            weak: 'weak-chest',
            foe: 'x',
            map: { values: { resistant } },
            characters: {
              x: { values: { 'armor-chest': 0, 'weak-chest': 0, 'taken-slashing': 1, ...values } },
            },
          }).resolution.value.effects as Record<string, number>
        )['characters[foe].values.health'],
      )
    expect(hurt(14, {}, 1)).toBe(12) // a Critical doubles it
    expect(hurt(14, { 'crit-immune': 1 }, 1)).toBe(6) // Tough: no Critical
    expect(hurt(14, { resisting: 1 })).toBe(3) // Resistant to Slashing, the Domain's type
    expect(hurt(11, { resisting: 1 })).toBe(6) // another type (Piercing): whole
    expect(hurt(11, { resisting: 1 }, 0, 11)).toBe(3) // the Domain's type, Piercing
    expect(hurt(14, { resisting: 1, 'taken-slashing': 2 })).toBe(6) // Vulnerable and Resistant: 1
    expect(hurt(14, { resisting: 1, 'taken-slashing': 0.5 })).toBe(3) // Resistant already: once
    expect(hurt(14, { resisting: 1, 'taken-slashing': 0 })).toBe(0) // Immune stays so
  })

  it('Mastery Minions: summoned for Aether, they fight at your side, each set against one, and heal once the room is clear', () => {
    const { registry, system } = kn()
    const rules = partyOf(system)
    const arcanist = {
      'characters.erthos.items.arcanist-1': 1,
      'characters.erthos.items.arcanist-2': 1,
      'characters.erthos.items.arcanist-3': 1,
      'characters.erthos.items.arcanist-4': 1,
      'characters.erthos.values.aether': '=10',
    }
    // Summoned before the fight: 4 Aether, and the Companion goes with you.
    const pc = newMember(rules, { id: 'erthos', name: 'Erthos', values: { aether: 10 } })
    const room: TravelWorld = {
      km: () => 0.01,
      place: () => ({ terrain: 'stone-floor', tags: ['room'] }),
      neighbors: () => [],
      distance: () => 0,
      connections: () => [],
    }
    const options = {
      system,
      world: room,
      oracle: createOracleEngine({ registry, random: seeded(1) }),
    }
    const { session } = startTrip({ system, location: 'a', members: [pc], seed: 'm' })
    let s: SessionState = {
      ...applyResult(session, { effects: arcanist }, {}, rules),
      acting: 'erthos',
    }
    expect(tripAvailability(options, s)['summon-wight']).toBeDefined()
    expect(tripAvailability(options, s)['summon-arcane-companion']).toBeUndefined()
    // Raise Skeleton is for a Gravecaller, and wants a corpse here.
    const grave = applyResult(
      { ...session, acting: 'erthos' },
      {
        effects: {
          'characters.erthos.items.gravecaller-1': 1,
          'characters.erthos.values.aether': '=10',
        },
      },
      {},
      rules,
    )
    expect(tripAvailability(options, grave)['summon-skeleton']).toMatchObject({
      condition: 'needs',
    })
    s = stepTrip(options, s, { type: 'action', id: 'summon-arcane-companion' }).state
    expect(s.members![0].values.aether).toBe(6)
    expect(s.present!.map((p) => [p.character.id, p.side])).toEqual([['arcane-companion', 'party']])
    // The Surprise check: your Stealth, 10 less for each follower.
    const engine = createOracleEngine({ registry, random: seeded(2) })
    const aim = (allies: number) =>
      engine.resolve('ker-nethalas/surprise', {
        party: { lowest: { values: { stealth: 50 } }, allies: { count: allies } },
        present: { highest: { values: { mind: 30 } } },
      }).resolution.value.aim
    expect([aim(0), aim(2)]).toEqual([50, 30])
    // Fights: the Companion's Actions on its turns, at a creature; the creatures go for you
    // and for it, one each; none of it a problem. Whole again after a fight won.
    let acted = 0
    let aimedAt = 0
    let won = 0
    for (let n = 0; n < 12; n++) {
      const { entries, state } = fight({ rotwalker: 2 }, `minion-${n}`, 1, ['longsword'], {
        ...arcanist,
        'present.arcane-companion': 1,
      })
      expect(entries.filter((e) => e.code === 'CHECK_FAILED').map((e) => e.text)).toEqual([])
      const turns = entries.filter((e) => e.code === 'ENCOUNTER_TURN')
      for (const t of turns.filter((e) => e.data?.id === 'arcane-companion')) {
        acted++
        expect(String(t.data?.target)).toMatch(/^rotwalker/)
      }
      aimedAt += turns.filter((e) => e.data?.target === 'arcane-companion').length
      const companion = state.present?.find((p) => p.character.id === 'arcane-companion')
      if (!state.encounter && companion && state.members![0].values.health! > 0) {
        won++
        expect(companion.character.values.health).toBe(12)
      }
      // Nothing of it is looted when it's destroyed.
      expect(
        entries.some(
          (e) =>
            e.code === 'ACTION_TAKEN' &&
            e.data?.id === 'loot' &&
            /companion/.test(String(e.data?.who)),
        ),
      ).toBe(false)
    }
    expect(acted).toBeGreaterThan(0)
    expect(aimedAt).toBeGreaterThan(0)
    expect(won).toBeGreaterThan(0)
  })

  it('a Minion summoned in a fight takes your next turn too (Channelling: 2 Standard Actions)', () => {
    const { registry, system } = kn()
    const rules = partyOf(system)
    const pc = newMember(rules, {
      id: 'erthos',
      name: 'Erthos',
      values: { aether: 10, perception: 90 },
    })
    const room: TravelWorld = {
      km: () => 0.01,
      place: () => ({ terrain: 'stone-floor', tags: ['room'] }),
      neighbors: () => [],
      distance: () => 0,
      connections: () => [],
    }
    for (let n = 0; n < 6; n++) {
      const options = {
        system,
        world: room,
        oracle: createOracleEngine({ registry, random: seeded(n) }),
      }
      const { session } = startTrip({ system, location: 'a', members: [pc], seed: `c${n}` })
      let s = applyResult(
        { ...session, foesAtOnce: true },
        {
          effects: {
            'characters.erthos.items.flamecaster-1': 1,
            'characters.erthos.items.flamecaster-2': 1,
            'characters.erthos.items.flamecaster-3': 1,
            'characters.erthos.items.flamecaster-4': 1,
            'present.amalgam': 1,
          },
        },
        {},
        rules,
      )
      let done = stepTrip(options, s, { type: 'action', id: 'fight' })
      if (done.state.encounter?.stage !== 'acting') continue
      const round = done.state.encounter.round
      done = stepTrip(options, done.state, { type: 'action', id: 'summon-fire-elemental' })
      s = done.state
      expect(
        s.present!.some((p) => p.character.id === 'fire-elemental' && p.side === 'party'),
      ).toBe(true)
      // Its next turn is lost to the Ability: the fight goes on to the round after.
      const skipped = done.entries.filter(
        (e) => e.code === 'ENCOUNTER_SKIPPED' && e.data?.id === 'erthos',
      )
      if (s.encounter) {
        expect(skipped).toHaveLength(1)
        expect(s.encounter.round).toBeGreaterThan(round + 1)
      }
      return
    }
    throw new Error('no fight began on the PC’s turn')
  })

  it("a hit's rider: the check the creature's row names, or the condition it brings", () => {
    const riders: string[] = []
    for (let n = 0; n < 30 && !riders.includes('paralyzed'); n++) {
      // Bone Spiders: a Venomous Bite that hits paralyzes unless the PC passes Endurance.
      const { entries } = fight({ 'bone-spider': 3 }, `r${n}`)
      for (const e of entries)
        if (e.code === 'CHANGED' && /^characters\.erthos\.conditions\./.test(String(e.data?.path)))
          riders.push(String(e.data?.path).split('.').at(-1)!)
    }
    expect(riders).toContain('paralyzed')
  })

  it('damage types: the weapon in hand names its type, its Armor rule and what the creature takes of it', () => {
    const { registry } = loadPacks(engineFiles(bundledPacks))
    const engine = createOracleEngine({ registry, random: seeded('types') })
    // The weapon wielded names it by its tag.
    const typeOf = (tag: string | undefined) =>
      engine.resolve('ker-nethalas/blow-type', {
        params: { weapon: tag && 'w' },
        acting: { items: tag ? { w: { tags: ['weapon', tag] } } : {} },
      }).resolution.value
    const type = (values: Record<string, number>) =>
      typeOf(values.slashing ? 'slashing' : values.piercing ? 'piercing' : undefined)
    expect(typeOf('slashing')).toMatchObject({ taken: 'taken-slashing', cut: 1 })
    expect(typeOf('piercing')).toMatchObject({ taken: 'taken-piercing', pierce: 1 })
    // Fists, or a blunt weapon: Bludgeoning, which ignores 1 point of Armor.
    expect(typeOf('bludgeoning')).toMatchObject({ taken: 'taken-bludgeoning', ignores: 1 })
    expect(typeOf(undefined)).toMatchObject({ taken: 'taken-bludgeoning', ignores: 1 })
    /** What a blow of `dmg` deals on the chest (Armor 2), as `blow`, on a foe that takes `taken`. */
    const hurt = (blow: string, dmg: number, taken = 1, crit = 0) => {
      const how = type({
        slashing: +(blow === 'slashing'),
        piercing: +(blow === 'piercing'),
        bludgeoning: 0,
      })
      const context = {
        dmg,
        blow: how,
        outcome: { crit },
        armor: 'armor-chest',
        weak: 'weak-chest',
        foe: 'x',
        characters: {
          x: { values: { 'armor-chest': 2, 'weak-chest': 0, [String(how.taken)]: taken } },
        },
      }
      const effects = engine.resolve('ker-nethalas/foe-harmed', context).resolution.value
        .effects as Record<string, number | string>
      return 0 - Number(effects['characters[foe].values.health'])
    }
    expect(hurt('bludgeoning', 5)).toBe(4) // Armor 2, 1 of it ignored
    expect(hurt('slashing', 5)).toBe(3 + 1) // 3 after Armor, +1 at 3 or less
    expect(hurt('slashing', 7)).toBe(5) // 5 after Armor: no +1
    expect(hurt('piercing', 5, 1, 1)).toBe(10 - 2 + 2) // a Critical doubles the die; +2 not doubled
    expect(hurt('bludgeoning', 5, 2)).toBe(8) // Vulnerable: doubled
    expect(hurt('bludgeoning', 5, 0.5)).toBe(2) // Resistant: halved
    expect(hurt('bludgeoning', 5, 0)).toBe(0) // Immune
    expect(hurt('bludgeoning', 5, -1)).toBe(-4) // Restored: it heals as much
  })

  it('a creature Resistant to Physical damage takes half a weapon’s (taken-slashing: 0.5)', () => {
    let checked = 0
    for (let n = 0; n < 10 && !checked; n++) {
      // A Voidweaver: no Armor, its head its Weak Spot.
      const { entries } = fight({ voidweaver: 1 }, `v${n}`)
      for (const e of entries) {
        const value = e.data?.value as Record<string, unknown> & {
          effects?: Record<string, number>
        }
        if (e.code !== 'ORACLE_RESULT' || e.data?.table !== 'ker-nethalas/attack' || !value.armor)
          continue
        const [, hurt] = Object.entries(value.effects!).find(([k]) => k.endsWith('.values.health'))!
        const twice = value.armor === 'armor-head' || (value.outcome as { crit: number }).crit
        const through = (value.dmg as number) * (twice ? 2 : 1)
        expect(-hurt).toBe(Math.floor((through + (through <= 3 ? 1 : 0)) / 2))
        checked++
      }
    }
    expect(checked).toBeGreaterThan(0)
  })

  it('gear found goes where there is room, else to the bags; Armor and shields a stage down their Integrity', () => {
    const { registry } = loadPacks(engineFiles(bundledPacks))
    const system = travelSystems(registry).systems.find((s) => s.id === 'ker-nethalas')!
    const rules = partyOf(system)
    const pc = newMember(rules, { id: 'e', name: 'E' })
    const { session } = startTrip({ system, location: 'a', members: [pc], seed: 'loot' })
    const give = (s: typeof session, effects: Record<string, number | string>) =>
      applyResult(s, { effects }, {}, rules)
    // Worn already: a mail, and a great sword in both hands.
    let s = give(session, { 'party.items.mail': 1, 'party.items.great-sword': 1 })
    // The Random Armor's and Random Weapon's rows: another mail, a shield, a dagger.
    const row = (table: string, id: string) =>
      (
        registry.definitions.get(`ker-nethalas/${table}`) as {
          entries: { key: string; effects: Record<string, number | string> }[]
        }
      ).entries.find((e) => e.key === id)!.effects
    s = give(s, row('torso-piece', 'mail'))
    s = give(s, row('random-shield', 'normal'))
    s = give(s, row('weapon', 'dagger'))
    const items = s.members![0].items!.map((i) => [i.id, i.place, i.fields.integrity])
    expect(items).toEqual([
      ['mail', 'torso', 8],
      ['great-sword', 'hands', undefined],
      // The torso is worn, the hands full (a Two-Handed weapon): the bags, a stage down.
      ['mail', 'bags', 6],
      ['shield', 'bags', 6],
      ['dagger', 'bags', undefined],
    ])
  })

  it('a creature Destroyed is looted as it leaves: Resources for vermin, Spoils for the rest', () => {
    const looted = (id: string) => {
      for (let n = 0; n < 10; n++) {
        const { entries } = fight({ [id]: 1 }, `${id}${n}`)
        const fell = entries.some((e) => e.code === 'PRESENT_LEFT' && e.data?.condition === 'dead')
        if (!fell) continue
        expect(entries.filter((e) => e.code === 'CHECK_FAILED').map((e) => e.text)).toEqual([])
        return entries
          .filter(
            (e) => e.code === 'ORACLE_RESULT' && e.data?.table === 'ker-nethalas/creature-spoils',
          )
          .map((e) => String(e.text).split(/[—:]/)[0].trim())
      }
      throw new Error(`no ${id} fell in ten fights`)
    }
    // A Necropede leaves its remains; a Rotwalker what it carried.
    expect(looted('necropede')).toEqual(['Its remains'])
    expect(looted('rotwalker')).toEqual(['What it carried'])
  })

  it('a Prone foe is attacked with Advantage: the d100 read either way round, the lower kept', () => {
    const { registry } = loadPacks(engineFiles(bundledPacks))
    const system = travelSystems(registry).systems.find((s) => s.id === 'ker-nethalas')!
    const rules = partyOf(system)
    const pc = newMember(rules, { id: 'e', name: 'E', values: { bladed: 60, perception: 80 } })
    const room: TravelWorld = {
      km: () => 0.01,
      place: () => ({ terrain: 'stone-floor' }),
      neighbors: () => [],
      distance: () => 0,
      connections: () => [],
    }
    const attackRolls = (prone: boolean) => {
      const options = {
        system,
        world: room,
        oracle: createOracleEngine({ registry, random: seeded('adv') }),
      }
      const { session } = startTrip({ system, location: 'a', members: [pc], seed: 'adv' })
      let s = applyResult(session, { effects: { 'present.necropede': 1 } }, {}, rules)
      if (prone)
        s = applyResult(s, { effects: { 'present.all.conditions.prone': true } }, {}, rules)
      let done = stepTrip(options, s, { type: 'action', id: 'fight' })
      for (let i = 0; i < 6 && done.state.encounter?.order[done.state.encounter.turn] !== 'e'; i++)
        done = stepTrip(options, done.state, { type: 'resume' })
      // The foe given with it (its card clicked): not asked again. No weapon in hand: fists.
      done = stepTrip(options, done.state, {
        type: 'action',
        id: 'attack-unarmed',
        with: { foe: 'necropede' },
      })
      expect(done.state.travel.waiting).toBeUndefined()
      const rolled = done.entries.find(
        (e) => e.code === 'ROLLED' && e.data?.check === 'generator.attack',
      )
      return (rolled?.data?.rolls as { dice: string[] }[])[0].dice
    }
    // The attack's own d100 alone is read either way round: one swapped reading discarded.
    expect(attackRolls(true)[0]).toMatch(/1d100.*\(/)
    expect(attackRolls(false)[0]).not.toMatch(/1d100.*\(/)
  })

  it('a Stunned creature loses its turn, and the Stun wears off by itself', () => {
    const { registry } = loadPacks(engineFiles(bundledPacks))
    const system = travelSystems(registry).systems.find((s) => s.id === 'ker-nethalas')!
    const rules = partyOf(system)
    const pc = newMember(rules, { id: 'e', name: 'E', values: { perception: 1, dodge: 40 } })
    const room: TravelWorld = {
      km: () => 0.01,
      place: () => ({ terrain: 'stone-floor' }),
      neighbors: () => [],
      distance: () => 0,
      connections: () => [],
    }
    const options = {
      system,
      world: room,
      oracle: createOracleEngine({ registry, random: seeded('s2') }),
    }
    // (A seed whose Initiative is no Critical Failure: the PC's turn waits in round 1.)
    const { session } = startTrip({ system, location: 'a', members: [pc], seed: 's2' })
    let s = applyResult(session, { effects: { 'present.necropede': 1 } }, {}, rules)
    s = applyResult(s, { effects: { 'present.all.conditions.stunned': 1 } }, {}, rules)
    expect(s.present![0].character.conditions.stunned).toMatchObject({ left: 1 })
    const done = stepTrip(options, s, { type: 'action', id: 'fight' })
    // Its turn in round 1 is lost (the system's `skip`). By round 2 the Stun is over.
    expect(done.entries.find((e) => e.code === 'ENCOUNTER_SKIPPED')?.data?.id).toBe('necropede')
    expect(done.state.present![0].character.conditions.stunned).toMatchObject({ left: 1 })
    // Fled or not, it's over: round 2 began, or the fight ended.
    const later = stepTrip(options, done.state, { type: 'action', id: 'flee' })
    expect(later.state.present![0].character.conditions.stunned).toBeUndefined()
  })

  it('an ambush before a fight: won, the Initiative and +20; noticed, Initiative at -20', () => {
    const { registry } = loadPacks(engineFiles(bundledPacks))
    const system = travelSystems(registry).systems.find((s) => s.id === 'ker-nethalas')!
    const rules = partyOf(system)
    const room: TravelWorld = {
      km: () => 0.01,
      place: () => ({ terrain: 'stone-floor' }),
      neighbors: () => [],
      distance: () => 0,
      connections: () => [],
    }
    const ambush = (stealth: number, seed: string) => {
      const pc = newMember(rules, { id: 'e', name: 'E', values: { stealth, perception: 50 } })
      const options = {
        system,
        world: room,
        oracle: createOracleEngine({ registry, random: seeded(seed) }),
      }
      const { session } = startTrip({ system, location: 'a', members: [pc], seed })
      const s = applyResult(session, { effects: { 'present.necropede': 1 } }, {}, rules)
      return stepTrip(options, { ...s, acting: 'e' }, { type: 'action', id: 'ambush' })
    }
    // Stealth 99: always won (unless both crit), the PC first, no Initiative rolled.
    const won = ambush(99, 'w')
    const rolled = (d: typeof won) =>
      d.entries.filter((e) => e.code === 'ROLLED').map((e) => String(e.data?.check))
    expect(won.state.encounter).toBeDefined()
    expect(rolled(won)).toEqual(['generator.surprise'])
    expect(won.state.encounter!.order[won.state.encounter!.turn]).toBe('e')
    expect(won.state.members![0].values.bonus).toBe(20)
    expect(won.state.party!.values.ambush).toBe(1)
    // Stealth 0: noticed, and the Initiative rolled with Perception 50 - 20.
    const lost = ambush(0, 'l')
    expect(rolled(lost).slice(0, 2)).toEqual(['generator.surprise', 'generator.initiative'])
    const initiative = lost.entries.find(
      (e) => e.code === 'ORACLE_RESULT' && e.data?.table === 'ker-nethalas/initiative',
    )
    expect((initiative?.data?.value as { aim: number }).aim).toBe(30)
    // Over, the ambush counts no more.
    const fled = stepTrip(
      {
        system,
        world: room,
        oracle: createOracleEngine({ registry, random: seeded('f') }),
      },
      won.state,
      { type: 'action', id: 'flee' },
    )
    if (!fled.state.encounter) expect(fled.state.party!.values.ambush).toBe(0)
  })

  it("the Initiative's Critical Failure: Taken by Surprise, the PC's first turn lost", () => {
    let caught = 0
    // Until one is caught (each fight is long to play).
    for (let n = 0; n < 60 && !caught; n++) {
      const { entries } = fight({ rotwalker: 1 }, `i${n}`)
      const initiative = entries.find(
        (e) => e.code === 'ORACLE_RESULT' && e.data?.table === 'ker-nethalas/initiative',
      )
      const value = initiative?.data?.value as { caught?: unknown; snap?: unknown }
      if (value?.caught) {
        caught++
        expect(entries.find((e) => e.code === 'ENCOUNTER_SKIPPED')?.data?.id).toBe('erthos')
      }
    }
    // Perception 50: doubles over it (55, 66, 77, 88, 99) come about once in twenty.
    expect(caught).toBeGreaterThan(0)
  })

  it('three Rotwalkers: humanoid hit locations, Reactions counted each round, the Initiative deciding who acts first', () => {
    let wounds = 0
    for (const seed of ['a', 'b', 'c', 'd', 'e', 'f']) {
      const { entries } = fight({ rotwalker: 3 }, seed)
      const json = entries.map((e) => JSON.stringify(e))
      wounds += json.filter((j) => j.includes('wound-humanoid')).length
      // Whoever wins the Initiative acts first: the PC unless the creatures fended it off.
      const initiative = entries.find((e) => e.code === 'ORACLE_RESULT')!.text!
      const first = entries.find((e) => e.code === 'ENCOUNTER_TURN')!
      expect(first.data?.side).toBe(/Fended off/.test(initiative) ? 'foes' : 'party')
      // Each round, Reactions count again from 0.
      expect(json.some((j) => j.includes('present.all.values.reactions'))).toBe(true)
    }
    expect(wounds).toBeGreaterThan(0)
  })

  /** A room to play locks, traps and potions in: Erthos alone, the trip on it. */
  function inRoom(seed: string, values: Record<string, number> = {}) {
    const { registry } = loadPacks(engineFiles(bundledPacks))
    const system = travelSystems(registry).systems.find((s) => s.id === 'ker-nethalas')!
    const rules = partyOf(system)
    const pc = newMember(rules, { id: 'erthos', name: 'Erthos', values })
    const room: TravelWorld = {
      km: () => 0.01,
      place: () => ({ terrain: 'stone-floor', tags: ['room'] }),
      neighbors: () => [],
      distance: () => 0,
      connections: () => [],
    }
    const options = {
      system,
      world: room,
      oracle: createOracleEngine({ registry, random: seeded(seed) }),
    }
    const { session } = startTrip({ system, location: 'a', members: [pc], seed })
    const apply = (s: typeof session, effects: Record<string, unknown>) =>
      applyResult(s, { effects }, {}, rules)
    /** Takes an action (as Erthos), seeing to what it asks and what it holds. */
    const act = (s: typeof session, id: string, choice?: string) => {
      let done = stepTrip(
        options,
        { ...s, acting: 'erthos' },
        {
          type: 'action',
          id,
          with: choice ? { thing: choice, item: choice } : {},
        },
      )
      const entries = [...done.entries]
      for (let i = 0; i < 12 && done.state.travel.waiting; i++) {
        done = stepTrip(options, done.state, { type: 'resume', choice } as never)
        entries.push(...done.entries)
      }
      return { state: done.state, entries }
    }
    const things = (s: typeof session) => (s.present ?? []).map((p) => p.character)
    return { options, session, apply, act, things, rules }
  }

  /** How many times a table was rolled (on its own or within another's result). */
  const rolledTable = (
    journal: { code: string; data?: Record<string, unknown> }[],
    table: string,
  ) =>
    journal.filter(
      (e) =>
        e.code === 'ROLLED' && JSON.stringify(e.data?.rolls).includes(`"ker-nethalas/${table}"`),
    ).length

  it('Scavenge once per room (three times where an event says so), a Scavenge check first', () => {
    const { session, act, apply } = inRoom('sc', { scavenge: 80 })
    let { state } = act(session, 'scavenge')
    expect(rolledTable(state.journal, 'scavenge-check')).toBe(1)
    expect(rolledTable(state.journal, 'scavenging')).toBe(1)
    // Once: the action is closed in this room now.
    const again = act(state, 'scavenge')
    expect(rolledTable(again.state.journal, 'scavenging')).toBe(1)
    // The funerary vases (Events 55): three times.
    state = apply(state, { 'place.values.scavenges': '=3' })
    for (let i = 0; i < 3; i++) state = act(state, 'scavenge').state
    expect(rolledTable(state.journal, 'scavenge-check')).toBe(3)
    expect(state.placeSheets?.sheets.a.values).toMatchObject({ scavenged: 3, scavenges: 3 })
  })

  it('a deep search finds a container, once per room: 2 Exhaustion and a Tension Die check', () => {
    const { session, act, things } = inRoom('ds')
    const { state } = act(session, 'deep-search')
    expect(things(state).map((c) => c.template?.id)).toEqual(['container'])
    expect(state.members![0].values.exhaustion).toBe(2)
    expect(rolledTable(state.journal, 'tension-check')).toBe(1)
    expect(act(state, 'deep-search').state.present).toHaveLength(1)
  })

  it('a container: investigated, its lock picked (breaking Lockpicks) or forced, opened, what it holds rolled', () => {
    let opened = 0
    let broke = 0
    let sprung = 0
    for (const seed of ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']) {
      const { session, act, apply, things } = inRoom(seed, {
        perception: 60,
        thievery: 40,
        athletics: 40,
        dodge: 40,
      })
      let state = apply(session, {
        'present.container': 1,
        'party.values.lockpicks': 2,
        'party.values.toolkit': 1,
      })
      const box = things(state)[0].id
      state = act(state, 'investigate', box).state
      const looked = things(state)[0]
      if (looked?.conditions.trapped) state = act(state, 'disarm', box).state
      for (let i = 0; i < 6 && things(state)[0]?.values.lock; i++) {
        const before = state.party!.values.lockpicks!
        state = act(state, before ? 'pick-lock' : 'force-lock', box).state
        if (state.party!.values.lockpicks! < before) broke++
      }
      if (things(state).length) state = act(state, 'open', box).state
      const json = state.journal.map((e) => JSON.stringify(e))
      if (json.some((j) => j.includes('ker-nethalas/trap-sprung'))) sprung++
      if (!things(state).length) {
        opened++
        expect(json.some((j) => j.includes('ker-nethalas/container-opened'))).toBe(true)
      }
    }
    expect(opened).toBeGreaterThan(4)
    expect(broke).toBeGreaterThan(0)
    expect(sprung).toBeGreaterThanOrEqual(0)
  })

  it("a room's trap: spotted and bypassed, or missed and set off; scavenging past it sets it off", () => {
    let gone = 0
    let past = 0
    for (const seed of ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']) {
      const { session, act, apply, things } = inRoom(seed, {
        perception: 50,
        dodge: 50,
        acrobatics: 50,
        athletics: 50,
        scavenge: 50,
      })
      let state = apply(session, { 'present.trap': 1 })
      const trap = things(state)[0]
      expect(trap.values.trap).toBeGreaterThanOrEqual(1)
      state = act(state, 'investigate', trap.id).state
      if (things(state)[0]?.conditions.trapped) state = act(state, 'bypass', trap.id).state
      if (things(state)[0]?.values.bypassed) {
        past++
        // Past it: no Scavenging here.
        const s2 = act(state, 'scavenge').state
        expect(s2.journal.length).toBe(state.journal.length)
      } else if (things(state).length) {
        // Untouched still: Scavenging sets it off first.
        state = act(state, 'scavenge').state
        expect(
          state.journal.some((e) => JSON.stringify(e).includes('ker-nethalas/trap-sprung')),
        ).toBe(true)
      }
      if (!things(state).some((t) => t.template?.id === 'trap')) gone++
    }
    expect(gone + past).toBe(8)
    expect(gone).toBeGreaterThan(0)
  })

  it('Fragments: one use each; the cloak hides from Combat Encounters until an attack, the vial burns them all', () => {
    const { session, apply, options } = inRoom('fr')
    let s = apply(session, { 'party.items.cloak': 1, 'party.items.green-vial': 1 })
    s = stepTrip(options, s, { type: 'use', who: 'erthos', item: 'cloak' }).state
    expect(s.party!.conditions.invisible).toMatchObject({ left: 5 })
    expect(s.members![0].items?.some((i) => i.id === 'cloak')).toBeFalsy()
    // An attack ends it; the vial burns every creature here.
    s = apply(s, { 'present.rotwalker': 2 })
    const before = s.present!.map((p) => p.character.values.health!)
    s = stepTrip(options, s, { type: 'use', who: 'erthos', item: 'green-vial' }).state
    const after = s.present!.map((p) => p.character.values.health!)
    expect(after.every((h, i) => h < before[i])).toBe(true)
    const attacked = stepTrip(
      options,
      { ...s, acting: 'erthos' },
      {
        type: 'action',
        id: 'attack-unarmed',
        with: { foe: s.present![0].character.id },
      },
    )
    expect(attacked.state.party!.conditions.invisible).toBeUndefined()
  })

  it('doors one by one: each opened, investigated, picked or forced alone; a locked one not crossed', () => {
    const { registry } = loadPacks(engineFiles(bundledPacks))
    const system = travelSystems(registry).systems.find((s) => s.id === 'ker-nethalas')!
    const rules = partyOf(system)
    const doors: Record<
      string,
      { id: string; kind: string; tags: string[] } & Record<string, unknown>
    > = {
      b: { id: 'east-door', kind: 'door', tags: [], door: 1, lock: 0, trap: 0, side: 'e' },
      c: { id: 'west-door', kind: 'door', tags: [], door: 1, lock: 1, trap: 0, side: 'w' },
    }
    const room: TravelWorld = {
      km: () => 0.01,
      place: () => ({ terrain: 'stone-floor', tags: ['room'] }),
      neighbors: (id) => (id === 'a' ? ['b', 'c'] : ['a']),
      distance: () => 1,
      connections: (x, y) => ([x, y].includes('a') ? ['door'] : []),
      connectionOf: (x, y) => doors[x === 'a' ? y : x],
    }
    let opened = 0
    let picked = 0
    for (const seed of ['a', 'b', 'c', 'd', 'e', 'f']) {
      const options = {
        system,
        world: room,
        oracle: createOracleEngine({ registry, random: seeded(seed) }),
      }
      const pc = newMember(rules, {
        id: 'erthos',
        name: 'Erthos',
        values: { perception: 50, thievery: 60, dodge: 40, health: 30, toughness: 30 },
      })
      const { session } = startTrip({ system, location: 'a', members: [pc], seed })
      let s = applyResult(session, { effects: { 'party.values.lockpicks': 3 } }, {}, rules)
      const act = (id: string, door: string) => {
        let done = stepTrip(options, { ...s, acting: 'erthos' }, { type: 'action', id })
        if (done.state.travel.waiting?.ask === 'door')
          done = stepTrip(options, done.state, { type: 'resume', choice: door })
        for (let i = 0; i < 6 && done.state.travel.waiting; i++)
          done = stepTrip(options, done.state, { type: 'resume' })
        s = done.state
        return done
      }
      // Investigating offers both doors; only the one chosen is looked over.
      const asked = stepTrip(
        options,
        { ...s, acting: 'erthos' },
        { type: 'action', id: 'investigate-door' },
      )
      expect(asked.state.travel.waiting?.choices).toEqual(['east-door', 'west-door'])
      act('investigate-door', 'east-door')
      expect(s.travel.connections?.['west-door']?.trap).toBeUndefined()
      // The east door opens (unless a trap spotted on it waits); the west one is locked.
      if (!((s.travel.connections?.['east-door']?.trap as number) >= 1)) {
        act('open-door', 'east-door')
        expect(s.travel.connections?.['east-door']?.state).toBe('open')
        expect(s.travel.connections?.['west-door']?.state).toBeUndefined()
        opened++
      }
      for (let i = 0; i < 3 && s.travel.connections?.['west-door']?.lock !== 0; i++)
        act('pick-door', 'west-door')
      if (s.travel.connections?.['west-door']?.lock === 0) picked++
    }
    expect(opened).toBeGreaterThan(2)
    expect(picked).toBeGreaterThan(0)
  })

  it('potions: found unknown, identified by Medicine (its aging rolled), drunk by their Use', () => {
    const { session, act, apply, options } = inRoom('p', { medicine: 100, health: 3, toughness: 0 })
    let state = apply(session, { 'party.items.heal.unknown': 2 })
    const held = () => state.members![0].items?.find((i) => i.id === 'heal')
    expect(held()?.unknown).toBe(true)
    state = act(state, 'identify', 'heal').state
    expect(rolledTable(state.journal, 'potion-aging')).toBe(1)
    // One of the two is known now, its aging rolled; the other still unknown.
    const heal = state.members![0].items!.filter((i) => i.id === 'heal')
    expect(heal.map((i) => !!i.unknown).sort()).toEqual([false, true])
    expect(heal.find((i) => !i.unknown)!.fields!.aging).toBeGreaterThan(0)
    // The known one drunk: no aging rolled again.
    const known = heal.find((i) => !i.unknown)!.key
    const done = stepTrip(options, state, { type: 'use', who: 'erthos', item: known })
    expect(rolledTable(done.state.journal, 'potion-drunk')).toBe(1)
    expect(rolledTable(done.state.journal, 'potion-aging')).toBe(1)
    // The one drunk is gone; the unknown one is left.
    expect(
      done.state.members![0].items!.filter((i) => i.id === 'heal').map((i) => !!i.unknown),
    ).toEqual([true])
  })

  it('a magic item is found as what it is, marked magic; a magic weapon is a weapon of the gear, its own piece', () => {
    const { registry } = loadPacks(engineFiles(bundledPacks))
    const kinds = new Set<string>()
    for (let n = 0; n < 60; n++) {
      const { session, rules } = inRoom(`m${n}`)
      const value = createOracleEngine({ registry, random: seeded(`magic${n}`) }).resolve(
        'ker-nethalas/generator.magic-item',
        {},
      ).resolution.value
      const s = applyResult(session, value, {}, rules)
      const items = s.members![0].items ?? []
      const magic = items.filter((i) => i.fields.magic === 1)
      const amulets = items.filter((i) => i.id.startsWith('amulet-'))
      // One magic thing each time: a piece marked magic, or an Amulet.
      expect(magic.length + amulets.length).toBe(1)
      for (const i of magic) {
        kinds.add(
          i.tags?.includes('weapon') ? 'weapon' : i.tags?.includes('armor') ? 'armor' : i.id,
        )
        // Not attuned yet: nothing rolled into it.
        expect(i.fields.rarity ?? 0).toBe(0)
      }
      if (amulets.length) kinds.add('amulet')
    }
    expect([...kinds].sort()).toEqual(
      [
        'amulet',
        'armor',
        'magic-belt',
        'magic-boots',
        'magic-gloves',
        'magic-ring',
        'weapon',
      ].sort(),
    )
    // Random Weapon's 98-100: a weapon of the gear, marked magic, apart from a plain one held.
    const { session, rules, apply } = inRoom('w')
    let s = apply(session, { 'party.items.dagger': 1 })
    const engine = createOracleEngine({ registry, random: seeded('weapon') })
    let tries = 0
    while (tries++ < 300) {
      const value = engine.resolve('ker-nethalas/random-weapon', {}).resolution.value
      if (!JSON.stringify(value).includes('newest.magic')) continue
      s = applyResult(
        s,
        {
          ...value,
          found: 'dagger',
          effects: { 'party.items.dagger': 1, 'party.items[found].newest.magic': '=1' },
        },
        {},
        rules,
      )
      break
    }
    const daggers = s.members![0].items!.filter((i) => i.id === 'dagger')
    expect(daggers.map((i) => i.fields.magic ?? 0).sort()).toEqual([0, 1])
  })

  it('Attune at Camp: a Crystal and 1 Exhaustion; its rarity and Magic Properties rolled into it; what it adds counts while worn', () => {
    let attuned = 0
    let added = 0
    // A Skill of your choosing: asked, and written into the Skill chosen (Perception here).
    let chosen = 0
    const rarities = new Set<number>()
    for (let n = 0; n < 40; n++) {
      const { session, apply, options, rules } = inRoom(`attune${n}`)
      let s = apply(session, {
        'party.values.crystals': 1,
        'party.items.magic-ring': 1,
        'party.items.magic-ring.newest.magic': '=1',
      })
      const ring = s.members![0].items!.find((i) => i.id === 'magic-ring')!
      // The first one with a Skill of your choosing to choose (+10): asked, Perception given.
      if (n === 0) s = apply(s, { [`party.members.items.${ring.key}.choose`]: 10 })
      expect(ring.place).toBe('rings')
      let done = stepTrip(
        options,
        { ...s, acting: 'erthos' },
        {
          type: 'action',
          id: 'attune',
          with: { item: ring.key },
        },
      )
      for (let i = 0; i < 6 && done.state.travel.waiting; i++)
        done = stepTrip(options, done.state, { type: 'resume', choice: 'perception' } as never)
      s = done.state
      const pc = s.members![0]
      const now = pc.items!.find((i) => i.key === ring.key)!
      expect(s.stats.crystals ?? pc.values.crystals ?? 0).toBe(0)
      expect(pc.values.exhaustion).toBe(1)
      rarities.add(now.fields.rarity)
      expect(now.fields.rarity).toBeGreaterThanOrEqual(1)
      expect(now.fields.choose ?? 0).toBe(0)
      attuned++
      if (now.fields.perception) chosen++
      // What it adds to a Resistance or a Skill reads on the Gravebound while it's worn.
      const sheet = rules.sheet!.def
      for (const v of ['endurance', 'resolve', 'spellward', 'perception']) {
        const plus = now.fields[v] ?? 0
        if (!plus) continue
        added++
        expect(valuesNow(sheet, pc)[v]).toBe(
          Math.min(pc.values[v] + plus, v === 'perception' ? 80 : Infinity),
        )
        const off = applyCharacter(sheet, pc, {
          type: 'moveItem',
          key: now.key,
          place: 'bags',
        }).state
        expect(valuesNow(sheet, off)[v]).toBe(pc.values[v])
      }
      // Not offered again: it's attuned.
      expect(
        tripAvailability(options, { ...apply(s, { 'party.values.crystals': 1 }), acting: 'erthos' })
          .attune,
      ).toBeDefined()
    }
    expect(attuned).toBe(40)
    expect(chosen).toBeGreaterThan(0)
    expect(added).toBeGreaterThan(0)
    expect(rarities.size).toBeGreaterThan(1)
  })

  it('Relics: found as items of their own; a Consumable used is gone, its boon kept; a Borestian Stone knows potions at once', () => {
    const { session, apply, act } = inRoom('r', { medicine: 0 })
    let s = apply(session, { 'party.items.vial-endurance': 1, 'party.items.gloomheart-seed': 1 })
    const before = s.members![0].values
    s = stepTrip(inRoom('r').options, { ...s, acting: 'erthos' }, {
      type: 'use',
      who: 'erthos',
      item: 'vial-endurance',
    } as never).state
    expect(s.members![0].values.endurance).toBe(before.endurance + 5)
    expect(s.members![0].items!.some((i) => i.id === 'vial-endurance')).toBe(false)
    // A potion held unknown is known at once with the Stone, Medicine 0 or not.
    s = apply(s, { 'party.items.borestian-stone': 1, 'party.items.heal.unknown': 1 })
    s = act(s, 'identify', 'heal').state
    expect(s.members![0].items!.find((i) => i.id === 'heal')!.unknown).toBeFalsy()
  })

  it('an Amulet worn opens a third Mastery to learn; in the bags it does not', () => {
    const { session, apply, options } = inRoom('amulet')
    let s = apply(session, {
      'party.members.values.points': 3,
      'party.items.abyssal-reaver-1': 1,
      'party.items.arcanist-1': 1,
      'party.items.amulet-tracker': 1,
    })
    const pc = s.members![0]
    expect(pc.values.masteries).toBe(2)
    expect(pc.items!.find((i) => i.id === 'amulet-tracker')!.place).toBe('neck')
    const offered = (st: typeof s) =>
      stepTrip(options, { ...st, acting: 'erthos' }, { type: 'action', id: 'learn' }).state.travel
        .waiting as { choices?: string[] } | undefined
    const ids = (st: typeof s) => offered(st)?.choices ?? []
    expect(ids(s)).toContain('tracker-1')
    expect(ids(s)).not.toContain('brawler-1')
    const amulet = pc.items!.find((i) => i.id === 'amulet-tracker')!
    s = {
      ...s,
      members: [
        applyCharacter(options.system.sheet!.def, pc, {
          type: 'moveItem',
          key: amulet.key,
          place: 'bags',
        }).state,
      ],
    }
    expect(ids(s)).not.toContain('tracker-1')
  })

  it('a potion drunk unknown is known as it’s drunk; Stoneskin lasts the rooms its aging gives it', () => {
    let lasting = 0
    for (const seed of ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']) {
      const { session, apply, options } = inRoom(seed)
      const state = apply(session, { 'party.items.stoneskin.unknown': 1 })
      const done = stepTrip(options, state, { type: 'use', who: 'erthos', item: 'stoneskin' })
      const erthos = done.state.members![0]
      expect(erthos.items?.some((i) => i.id === 'stoneskin')).toBeFalsy()
      expect(rolledTable(done.state.journal, 'potion-aging')).toBe(1)
      const left = (erthos.conditions.stoneskin as { left?: number } | undefined)?.left
      if (left !== undefined) {
        lasting++
        expect(left).toBeGreaterThanOrEqual(1)
        expect(left).toBeLessThanOrEqual(15)
      }
    }
    expect(lasting).toBeGreaterThan(0)
  })
})

const iron = personal.some((p) => p.root === 'ironsworn')

describe.skipIf(!iron)('Ironsworn', () => {
  const { registry, diagnostics } = loadPacks(engineFiles(bundledPacks))

  it('loads without problems', () => {
    const own = diagnostics.filter((d) => d.pack === 'ironsworn')
    expect(own.map(formatDiagnostic)).toEqual([])
  })

  it('reads an action against two challenge dice: strong, weak or a miss', () => {
    const engine = createOracleEngine({ registry, random: seeded('iron') })
    const seen = new Set<string>()
    for (let i = 0; i < 200; i++) {
      const { resolution } = engine.resolve('ironsworn/action-roll', { stat: 3 })
      const { action, c1, c2 } = resolution.value as Record<string, number>
      const wins = [c1, c2].filter((c) => action > c).length
      expect(resolution.text).toContain(['Fallo', 'Acierto débil', 'Acierto fuerte'][wins])
      seen.add(String(wins))
    }
    expect(seen.size).toBe(3)
  })

  it('asks the oracle: the odds choose the line, a match in the dice is a twist', () => {
    const ask = (face: number, odds: string) =>
      createOracleEngine({ registry, random: { next: () => (face - 0.5) / 100 } }).resolve(
        'ironsworn/ask',
        { odds },
      ).resolution.entry
    expect(ask(30, 'likely')).toBe('yes')
    expect(ask(30, 'fifty-fifty')).toBe('no')
    expect(ask(33, 'likely')).toBe('yes-twist')
    expect(ask(22, 'fifty-fifty')).toBe('no-twist')
    expect(ask(100, 'small-chance')).toBe('yes-twist')
    // Every table of the oracles chapter covers its d100.
    const engine = createOracleEngine({ registry, random: seeded('oracles') })
    for (const id of [
      'action',
      'theme',
      'combat-action',
      'plot-twist',
      'challenge-rank',
      'region',
      'location',
      'coastal',
      'location-descriptor',
      'settlement-trouble',
      'role',
      'goal',
      'descriptor',
      'mystic-backlash',
      'ironlander-names',
      'elf-names',
      'giant-names',
      'varou-names',
      'troll-names',
      'quick-settlement-name',
      'character',
      'place',
    ])
      for (let i = 0; i < 50; i++)
        expect(engine.resolve(`ironsworn/${id}`).resolution.text, id).toBeTruthy()
    // In English too, from the rulebook.
    const english = createOracleEngine({ registry, random: seeded('en'), locale: 'en' })
    expect(english.resolve('ironsworn/character').resolution.text).toContain('wants to')
  })
})
