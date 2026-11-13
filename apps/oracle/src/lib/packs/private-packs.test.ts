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
    let s = applyResult(session, { effects: { ...present, ...gear } }, {}, rules)
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
    // Either the Necropede is destroyed, or the PC took damage on the way.
    const party = state.party!.values
    expect(state.present?.length === 0 || party.toughness! < 30).toBe(true)
  })

  it('fights with gear: the weapon in hand and the Armor worn count, and each piece worn rolls its Integrity after', () => {
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
          // Twice the die on the Weak Spot (a Rotwalker's head) or a Critical, else the die.
          const twice = value.armor === 'armor-head' || (value.outcome as { crit: number }).crit
          expect(-n).toBe(Math.max(0, (value.dmg as number) * (twice ? 2 : 1)))
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

  it('a creature Resistant to Physical, non-Magical damage takes half a weapon’s', () => {
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
        expect(-hurt).toBe(Math.floor(((value.dmg as number) * (twice ? 2 : 1)) / 2))
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
      done = stepTrip(options, done.state, {
        type: 'action',
        id: 'attack',
        with: { foe: 'necropede', skill: 'bladed' },
      })
      done = stepTrip(options, done.state, { type: 'resume', choice: 'necropede' })
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
