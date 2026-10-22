import { loadPacks } from '@open-tabletop/oracle-engine'
import { describe, expect, it } from 'vitest'
import { corePack, greyMarchesPack } from './core.testing'
import { travelSystems } from './trip'
import { declaredOf, systemUses, usesNamed, usesOf, type Use } from './usage'

const where = (uses: Use[]) => uses.map((u) => `${u.how} ${u.at.kind} ${u.at.id} ${u.at.path}`)

describe('where a name is used', () => {
  const { registry } = loadPacks([...corePack(), ...greyMarchesPack()])
  const system = travelSystems(registry).systems.find((s) => s.id === 'grey-marches')!
  const uses = systemUses(registry, system)

  it('finds ways of travelling, terrains, roads, weather, actions, checks, factions and tables', () => {
    const of = (d: Parameters<typeof usesOf>[1]) => where(usesOf(uses, d, system))
    // Snow blocks the horse; the ferry puts the Company in a boat.
    expect(of({ kind: 'mode', id: 'horse' })).toContain(
      'names travel-rules default values.snowbound.blocks[0]',
    )
    expect(of({ kind: 'mode', id: 'boat' })).toContain(
      'names travel-rules default actions.ferry.do[4].travel.mode',
    )
    // Conditions that compare a terrain, a road, the weather.
    expect(of({ kind: 'terrain', id: 'forest' }).length).toBeGreaterThan(2)
    expect(of({ kind: 'edge', id: 'road' }).length).toBeGreaterThan(2)
    expect(of({ kind: 'weather', id: 'storm' })).toContain(
      'reads travel-rules default actions.forage.unless',
    )
    // …and the weather tables that set it.
    expect(of({ kind: 'weather', id: 'storm' }).some((w) => w.startsWith('sets table'))).toBe(true)
    // A forced march takes March; the camp's checks come at it.
    expect(of({ kind: 'action', id: 'march' })).toContain(
      'names travel-rules default actions.forced-march.do[2].do',
    )
    expect(of({ kind: 'action', id: 'camp' })).toContain(
      'names travel-rules default travel.halt.do',
    )
    // A check is used by the steps that roll it (`roll: checks.<event>`): none here, its
    // moments take it. A faction, by what reads its values.
    expect(of({ kind: 'check', id: 'ENCOUNTER_CHECK_REQUIRED' })).toEqual([])
    expect(of({ kind: 'faction', id: 'the-vale' }).some((w) => w.includes('table encounter'))).toBe(
      true,
    )
    // A table rolled by the entries of another, and a generator by an action's step.
    expect(
      of({ kind: 'rollable', id: 'table.reaction', pack: 'grey-marches' }).some((w) =>
        w.startsWith('names table encounter entries.'),
      ),
    ).toBe(true)
    expect(of({ kind: 'rollable', id: 'generator.ruin-delve', pack: 'grey-marches' })).toContain(
      'names travel-rules default actions.delve.do[1].roll',
    )
    // A roll mode, by the tables that offer it or take it by themselves.
    const advantage = [...registry.rollModes.values()].find((m) => m.localId === 'advantage')!
    expect(of({ kind: 'roll-mode', id: advantage.id })).toContain(
      'names table getting-lost modeWhen.advantage',
    )
    // The calendar: a part of the day begun (a moment, a time step) or compared.
    expect(of({ kind: 'day-part', division: 'part', id: 'morning' })).toContain(
      'names travel-rules default actions.grumble.on',
    )
    expect(of({ kind: 'day-part', division: 'part', id: 'morning' })).toContain(
      'names travel-rules default actions.camp.do[0].time',
    )
    // Declared, all of them.
    const declared = declaredOf(registry, system)
    for (const kind of [
      'mode',
      'terrain',
      'edge',
      'weather',
      'action',
      'check',
      'faction',
      'rollable',
    ])
      expect(declared.some((d) => d.kind === kind)).toBe(true)
  })

  it("finds the guide's Pathfinding in a table's roll mode, and the stat made of it", () => {
    const pathfinding = usesOf(
      uses,
      { kind: 'sheet-value', sheet: 'members', id: 'pathfinding' },
      system,
    )
    expect(where(pathfinding)).toContain('reads table getting-lost modeWhen.advantage')
    expect(where(pathfinding)).toContain('derives bindings default stats.navigation.from')
    // The role is read there too.
    expect(where(usesOf(uses, { kind: 'role', id: 'guide' }))).toContain(
      'reads table getting-lost modeWhen.advantage',
    )
    // Found by name, as written.
    expect(usesNamed(uses, 'roles.guide.values.pathfinding').length).toBeGreaterThan(0)
  })

  it('finds what changes a stat and what reads it, by its full and its short name', () => {
    const fatigue = where(usesOf(uses, { kind: 'stat', id: 'fatigue' }))
    expect(fatigue).toContain('changes travel-rules default actions.rest.do[1].effects')
    expect(fatigue).toContain('reads travel-rules default actions.camp.when')
    // A variable in a condition: the camp compares fatigue with Endurance.
    expect(where(usesOf(uses, { kind: 'stat', id: 'endurance' }))).toContain(
      'reads travel-rules default actions.camp.when',
    )
    // Morale is the Company's own value: its uses are the stat's (`from: { party: morale }`).
    const morale = usesOf(uses, { kind: 'sheet-value', sheet: 'party', id: 'morale' }, system)
    expect(where(morale)).toContain('derives bindings default stats.morale.from')
    expect(morale.some((u) => u.how === 'changes' && u.at.kind === 'table')).toBe(true)
  })

  it('finds values of the day set one day and read the next', () => {
    const hungry = where(usesOf(uses, { kind: 'day-value', id: 'hungry' }))
    expect(hungry).toContain('sets travel-rules default actions.eat.do[3].set')
    expect(hungry).toContain('reads travel-rules default actions.grumble.when')
    const lost = usesOf(uses, { kind: 'day-value', id: 'lost' })
    expect(lost.some((u) => u.how === 'sets' && u.at.id === 'getting-lost')).toBe(true)
    expect(lost.some((u) => u.name === 'yesterday.lost' && u.how === 'reads')).toBe(true)
  })

  it('finds supplies, conditions, reads, clocks and a sheet bound', () => {
    const food = where(usesOf(uses, { kind: 'supply', id: 'food' }))
    expect(food).toContain('reads travel-rules default actions.camp.when')
    expect(food).toContain('reads travel-rules default checks[12].when')
    // A member's condition read by a stat's `from`.
    expect(
      where(usesOf(uses, { kind: 'sheet-condition', sheet: 'members', id: 'wounded' }, system)),
    ).toContain('reads bindings default stats.survival.from.unless')
    // What tables read from the map: `hex.danger`, written in full.
    expect(where(usesOf(uses, { kind: 'read', id: 'danger' }))).toContain(
      'reads travel-rules default checks[4].when',
    )
    // A value the weather sets and the ford reads by its own name.
    const ford = where(usesOf(uses, { kind: 'read', id: 'fordModifier' }))
    expect(ford).toContain('reads oracle ford variants.high.roll')
    expect(ford.some((w) => w.startsWith('sets table'))).toBe(true)
    // A clock filled by a faction's turn and by another clock.
    const march = where(usesOf(uses, { kind: 'clock', id: 'fort-keld-mutinies' }))
    expect(march).toContain('changes clocks default clocks.the-iron-clans-march.onFull.effects')
    // Health's bound is another value of the same sheet.
    expect(
      where(usesOf(uses, { kind: 'sheet-value', sheet: 'members', id: 'maxHealth' }, system)),
    ).toContain('reads sheet companion values.health.max')
  })

  it('declares every stat, role, supply, value of the day, read and clock, and most are used', () => {
    const declared = declaredOf(registry, system)
    expect(declared).toContainEqual({ kind: 'role', id: 'lookout' })
    expect(declared).toContainEqual({ kind: 'read', id: 'icon.guards' })
    expect(declared).toContainEqual({ kind: 'sheet-value', sheet: 'factions', id: 'strength' })
    // Every stat of the showcase is used somewhere.
    for (const d of declared.filter((d) => d.kind === 'stat'))
      expect(usesOf(uses, d, system), d.id).not.toHaveLength(0)
  })

  it("leaves out an action's own parameters and dice", () => {
    expect(uses.some((u) => u.name.startsWith('params.'))).toBe(false)
    expect(uses.some((u) => /^\d*d\d+/.test(u.name))).toBe(false)
  })

  it("finds Core's few names: the Generic rules' supplies and sheets", () => {
    const { registry } = loadPacks(corePack())
    const core = travelSystems(registry).systems.find((s) => s.id === 'core')!
    const uses = systemUses(registry, core)
    const food = usesOf(uses, { kind: 'supply', id: 'food' })
    expect(food.some((u) => u.how === 'changes' && u.at.path.startsWith('actions.eat'))).toBe(true)
    // Only Core's packs: nothing of the Grey Marches.
    expect(uses.every((u) => u.at.pack === 'core')).toBe(true)
  })
})

/** A made-up system using each name in its short and full forms. */
const PACK = [
  { path: 'band/pack.yaml', content: 'id: band\nversion: 0.1.0\nlocale: en\nformat: 6\n' },
  {
    path: 'band/system.yaml',
    content:
      'kind: system\nname: Band\ntravel: travel-rules.default\nbindings: bindings.default\nsheet: sheet.member\nclocks: clocks.default\n',
  },
  {
    path: 'band/travel.yaml',
    content: `
kind: sheet
id: member
values:
  grit: { default: 1 }
  top: { default: 3 }
  hp: { default: 3, max: '{{self.values.top}}' }
conditions: { tired: {} }
---
kind: clocks
clocks: { doom: { segments: 4 } }
---
kind: travel-rules
travel:
  hoursPerDay: 8
  start: '07:00'
  onward: { do: actions.march, with: { until: destination } }
  halt: { at: '19:00', do: actions.camp }
terrains: { plains: { multiplier: 1 } }
modes: { walk: { kmPerDay: 24 } }
resources: { water: { min: 0 } }
checks:
  - { event: GATE, at: '07:00', when: { trip.below: water } }
actions:
  march:
    params: { until: { choices: [destination, hex] } }
    when: { hour: { gte: 7, lt: 19 }, marched: { lt: '{{hoursPerDay}}' } }
    do: [{ travel.move: '{{params.until}}' }]
  camp: { do: [{ time: '07:00' }, { set: { rested: true } }] }
values: { rested: {} }
---
kind: bindings
on: { GATE: { resolve: table.gate } }
roles: { scout: { name: Scout } }
stats:
  nerve: { from: { max: grit, unless: { conditions: tired } } }
---
kind: table
id: gate
roll: 1d6+{{nerve}}
entries:
  - { range: 1-3, when: { acting.conditions: tired }, result: 'Too tired' }
  - { range: 4-9, when: { roles.scout.values.grit: { gte: 2 } }, effects: { world.clocks.doom: 1 } }
---
kind: deck
id: fate
cards:
  - { id: thirst, effects: { party.resources.water: -1, characters.ann.values.hp: -1 } }
---
kind: generator
id: camp-site
fields:
  mood: { roll: '1d6', when: { yesterday.rested: true } }
template: 'A camp, {{mood}}, nerve {{party.stats.nerve}}'
`,
  },
]

describe('where a name is used, in every form', () => {
  const { registry, diagnostics } = loadPacks(PACK)
  const band = travelSystems(registry).systems.find((s) => s.id === 'band')!
  const uses = systemUses(registry, band)

  it('loads', () => {
    expect(diagnostics.filter((d) => d.severity === 'error')).toEqual([])
  })

  it('resolves short names to full ones', () => {
    // A generator's own fields (`{{mood}}`) aren't the system's names.
    expect(usesNamed(uses, 'mood')).toEqual([])
    expect(usesNamed(uses, 'trip.marched').map((u) => u.written)).toEqual(['marched'])
    expect(usesNamed(uses, 'system.hoursPerDay')).toHaveLength(1)
    // A stat by its own name, in a roll.
    expect(where(usesOf(uses, { kind: 'stat', id: 'nerve' }))).toEqual([
      'reads table gate roll',
      'reads generator camp-site template',
    ])
  })

  it("finds members' values and conditions wherever members are named", () => {
    const grit = where(usesOf(uses, { kind: 'sheet-value', sheet: 'members', id: 'grit' }, band))
    expect(grit).toEqual([
      'derives bindings default stats.nerve.from',
      'reads table gate entries[1].when',
    ])
    expect(where(usesOf(uses, { kind: 'sheet-value', sheet: 'members', id: 'hp' }, band))).toEqual([
      'changes deck fate cards.thirst.effects',
    ])
    expect(where(usesOf(uses, { kind: 'sheet-value', sheet: 'members', id: 'top' }, band))).toEqual(
      ['reads sheet member values.hp.max'],
    )
    expect(
      where(usesOf(uses, { kind: 'sheet-condition', sheet: 'members', id: 'tired' }, band)),
    ).toEqual([
      'reads bindings default stats.nerve.from.unless',
      'reads table gate entries[0].when',
    ])
  })

  it('finds supplies, values of the day, roles and clocks', () => {
    expect(where(usesOf(uses, { kind: 'supply', id: 'water' }))).toEqual([
      'reads travel-rules default checks[0].when',
      'changes deck fate cards.thirst.effects',
    ])
    expect(where(usesOf(uses, { kind: 'day-value', id: 'rested' }))).toEqual([
      'sets travel-rules default actions.camp.do[1].set',
      'reads generator camp-site fields.mood.when',
    ])
    expect(where(usesOf(uses, { kind: 'role', id: 'scout' }))).toEqual([
      'reads table gate entries[1].when',
    ])
    expect(where(usesOf(uses, { kind: 'clock', id: 'doom' }))).toEqual([
      'changes table gate entries[1].effects',
    ])
  })

  it('says what is declared and not used yet', () => {
    const unused = declaredOf(registry, band).filter((d) => usesOf(uses, d, band).length === 0)
    // A way the player picks, a terrain nothing asks about, a check its moment takes (no
    // step rolls it), what the Oracle rolls only by hand.
    expect(unused).toEqual([
      { kind: 'mode', id: 'walk' },
      { kind: 'terrain', id: 'plains' },
      { kind: 'check', id: 'GATE' },
      { kind: 'rollable', id: 'deck.fate', pack: 'band' },
      { kind: 'rollable', id: 'generator.camp-site', pack: 'band' },
    ])
  })
})
