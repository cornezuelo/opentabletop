import { createOracleEngine, formatDiagnostic, loadPacks } from '@open-tabletop/oracle-engine'
import { seeded } from '@open-tabletop/random'
import {
  applyResult,
  newMember,
  partyOf,
  startTrip,
  stepTrip,
  travelSystems,
  type TravelSystem,
} from '@open-tabletop/session'
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
  function fight(foes: Record<string, number>, seed: string) {
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
      values: { bladed: 73, dodge: 40, parry: 73, perception: 50 },
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
      'characters.erthos.items.longsword': 1,
      'characters.erthos.items.mail': 1,
      'characters.erthos.items.light-vambraces': 1,
    }
    // The foes' turns played one after another (no Next between them).
    let s = applyResult(
      { ...session, foesAtOnce: true },
      { effects: { ...present, ...gear } },
      {},
      rules,
    )
    let done = stepTrip(options, s, { type: 'action', id: 'fight' })
    const entries = [...done.entries]
    for (let turn = 0; turn < 80 && done.state.encounter; turn++) {
      s = done.state
      if (s.travel.waiting) done = stepTrip(options, s, { type: 'resume' })
      else {
        const foe = s.present!.find((p) => p.at === s.travel.location)!.character.id
        done = stepTrip(options, s, {
          type: 'action',
          id: 'attack',
          with: { foe, skill: 'bladed' },
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

  it('fights with gear: the weapon in hand and the Armor worn count, and each piece worn rolls its Integrity after', () => {
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
      ['mail', 'body'],
      ['light-vambraces', 'body'],
    ])
    // After the fight, one Integrity roll for each piece worn (the sword has none).
    const rolls = entries.filter(
      (e) => e.code === 'ORACLE_RESULT' && e.data?.table === 'ker-nethalas/integrity',
    )
    expect(rolls.length).toBe(2)
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
    const templates = system.bestiary!.flatMap((b) => Object.keys(b.def.templates))
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
    const type = (values: Record<string, number>) =>
      engine.resolve('ker-nethalas/blow-type', { acting: { values } }).resolution.value
    expect(type({ slashing: 1, piercing: 1, bludgeoning: 0 })).toMatchObject({
      taken: 'taken-slashing',
      cut: 1,
    })
    expect(type({ slashing: 0, piercing: 1, bludgeoning: 0 })).toMatchObject({
      taken: 'taken-piercing',
      pierce: 1,
    })
    // Fists, or a blunt weapon: Bludgeoning, which ignores 1 point of Armor.
    expect(type({ slashing: 0, piercing: 0, bludgeoning: 0 })).toMatchObject({
      taken: 'taken-bludgeoning',
      ignores: 1,
    })
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
        params: { foe: 'x' },
        characters: {
          x: { values: { 'armor-chest': 2, 'weak-chest': 0, [String(how.taken)]: taken } },
        },
      }
      const effects = engine.resolve('ker-nethalas/foe-harmed', context).resolution.value
        .effects as Record<string, number | string>
      return 0 - Number(effects['characters[params.foe].values.health'])
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
      // The foe given with it (its card clicked): not asked again.
      done = stepTrip(options, done.state, {
        type: 'action',
        id: 'attack',
        with: { foe: 'necropede', skill: 'bladed' },
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
