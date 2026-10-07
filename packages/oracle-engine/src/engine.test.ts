import { describe, expect, it } from 'vitest'
import { seeded, sequence } from '@open-tabletop/random'
import {
  createOracleEngine,
  emptyState,
  formatDiagnostic,
  loadPackFiles,
  loadPacks,
  OracleError,
  type OracleState,
  type PackFile,
} from './index'

/** RNG values that make a dN roll show the given faces, one die at a time. */
const faces = (n: number, ...values: number[]) => sequence(values.map((v) => (v - 1 + 0.5) / n))

const core: PackFile[] = [
  { path: 'core/pack.yaml', content: 'id: core\nversion: 0.1.0\nlocale: en\nlicense: MIT\n' },
  {
    path: 'core/oracles.yaml',
    content: `
kind: oracle
id: yes-no
inputs:
  likelihood: { options: [unlikely, even, likely], default: even }
roll: d100
variants:
  unlikely:
    entries:
      - { id: yes, range: 1-25, result: 'Yes', set: { answer: yes } }
      - { id: no, range: 26-100, result: 'No', set: { answer: no } }
  even:
    entries:
      - { id: yes, range: 1-50, result: 'Yes', set: { answer: yes } }
      - { id: no, range: 51-100, result: 'No', set: { answer: no } }
  likely:
    entries:
      - { id: yes, range: 1-75, result: 'Yes', set: { answer: yes } }
      - { id: no, range: 76-100, result: 'No', set: { answer: no } }
---
kind: table
id: weather
entries:
  - { id: clear, weight: 3, result: Clear }
  - { id: rain, weight: 1, result: Rain }
`,
  },
]

const test: PackFile[] = [
  {
    path: 'test/pack.yaml',
    content: `
id: test
version: 1.0.0
locale: es
dependencies: { core: ^0.1.0 }
aliases: { omens: core/weather }
`,
  },
  {
    path: 'test/tables.yaml',
    content: `
kind: table
id: encounters
roll: 1d6
entries:
  - { id: wolves, range: 1-2, result: '{{count}} lobos', set: { count: '{{2d6}}', kind: beast } }
  - { id: traders, range: 3-4, result: 'Mercaderes', set: { kind: humans } }
  - { id: ruin, range: 5, table: ruins }
  - { id: omen, range: 6, table: omens }
---
kind: table
id: ruins
roll: 1d2
entries:
  - { id: tower, range: 1, result: 'Torre en ruinas', set: { site: tower } }
  - { id: crypt, range: 2, result: 'Cripta', set: { site: crypt } }
---
kind: roll-modes
modes:
  advantage: { name: Ventaja, repeat: 2, keep: highest, cancels: disadvantage }
  disadvantage: { name: Desventaja, repeat: 2, keep: lowest }
---
kind: table
id: reaction
roll: '2d6 + {{pre}}'
modes: [advantage, disadvantage]
entries:
  - { id: hostile, range: 2-6, result: Hostil }
  - { id: neutral, range: 7-9, result: Neutral }
  - { id: friendly, range: 10-12, result: Amistoso }
---
kind: table
id: terrain-encounter
roll: 1d6
entries:
  - { id: forest, range: 1-6, when: { terrain: forest }, result: Osos }
  - { id: desert, range: 1-6, when: { terrain: desert }, result: Escorpiones }
---
kind: table
id: weather-by-season
roll: 1d2
entries:
  - { range: 1-2, table: 'weather-{{season}}' }
---
kind: table
id: weather-winter
roll: 1d2
entries:
  - { id: snow, range: 1-2, result: Nieve }
---
kind: table
id: unique
roll: 1d2
onExhausted: next
entries:
  - { id: dragon, range: 1, result: Dragón, once: true }
  - { id: rats, range: 2, result: Ratas }
---
kind: generator
id: encounter-check
fields:
  check: { roll: 1d6 }
  encounter: { when: { check: { gte: 5 } }, table: encounters }
  reaction: { when: { check: { gte: 5 } }, table: reaction, context: { pre: '{{pre}}' } }
template: '{{encounter}} ({{reaction}})'
---
kind: deck
id: events
cards:
  - { id: storm, result: Tormenta, count: 2 }
  - { id: ambush, result: Emboscada }
---
kind: deck
id: one-shot
reshuffle: manual
cards:
  - { id: only, result: Única }
`,
  },
  {
    path: 'test/locales/en/tables.yaml',
    content: `
encounters:
  name: Encounters
  entries:
    wolves: '{{count}} wolves'
    traders: Traders
ruins:
  entries:
    tower: Ruined tower
encounter-check:
  template: '{{encounter}} [{{reaction}}]'
events:
  cards:
    storm: Storm
`,
  },
]

const load = (extra: PackFile[] = []) => loadPacks([...core, ...test, ...extra])

describe('loading and validation', () => {
  it('loads valid packs without diagnostics', () => {
    const { ok, diagnostics, registry } = load()
    expect(diagnostics.map(formatDiagnostic)).toEqual([])
    expect(ok).toBe(true)
    expect(registry.definitions.has('test/encounters')).toBe(true)
    expect(registry.definitions.has('core/yes-no')).toBe(true)
  })

  it('reports semantic problems clearly', () => {
    const bad: PackFile[] = [
      {
        path: 'bad/pack.yaml',
        content: 'id: bad\nversion: 0.1.0\nlocale: en\ndependencies: { ghost: ^1.0.0 }\n',
      },
      {
        path: 'bad/defs.yaml',
        content: `
kind: table
id: overlap
roll: 1d6
entries:
  - { range: 1-3, result: A }
  - { range: 3-6, result: B }
---
kind: table
id: gaps
roll: 2d6
entries:
  - { range: 2-6, result: A }
  - { range: 9-12, result: B }
  - { range: 13-15, result: C }
---
kind: table
id: broken-ref
entries:
  - { table: nowhere }
---
kind: table
id: bad-dice
roll: 2x6
entries:
  - { range: 1, result: A }
---
kind: table
id: bad-when
entries:
  - { result: A, when: { danger: { between: [1, 2] } } }
---
kind: table
id: loop-a
entries:
  - { table: loop-b }
---
kind: table
id: loop-b
entries:
  - { table: loop-a }
---
kind: table
id: no-roll
entries:
  - { range: 1-2, result: A }
---
kind: deck
id: empty
cards: []
`,
      },
      { path: 'bad/broken.yaml', content: 'kind: table\nid: [unclosed\n' },
    ]
    const { ok, diagnostics } = loadPacks(bad)
    const messages = diagnostics.map(formatDiagnostic)
    const has = (fragment: string) =>
      expect(
        messages.some((m) => m.includes(fragment)),
        fragment,
      ).toBe(true)
    expect(ok).toBe(false)
    has('Missing dependency "ghost"')
    has('Ranges of entries "0" and "1" overlap')
    has('No entry for roll results: 7, 8')
    has('Entry "2" can never come up')
    has('Unknown table "nowhere"')
    has('bad-dice.roll')
    has('unknown operator "between"')
    has('Circular reference')
    has('Ranges need a roll on the table')
    has('a deck needs at least one card')
    has('Invalid YAML')
  })

  it('keeps definitions for other engines as extras instead of failing', () => {
    const { packs, diagnostics } = loadPackFiles([
      ...core,
      {
        path: 'core/travel.yaml',
        content: 'kind: travel-rules\nid: default\nday: { start: "06:00" }\n',
      },
    ])
    expect(diagnostics).toEqual([])
    expect(packs[0].extras).toMatchObject([{ kind: 'travel-rules', id: 'default' }])
  })

  it('warns about translations that point nowhere', () => {
    const { diagnostics } = load([
      {
        path: 'test/locales/en/extra.yaml',
        content: 'ghost:\n  name: Ghost\nruins:\n  entries:\n    cellar: Cellar\n',
      },
    ])
    const messages = diagnostics.map((d) => d.message)
    expect(messages).toContain('Translation for unknown definition "ghost"')
    expect(messages).toContain('Translation for unknown entry "cellar" of "ruins"')
  })
})

describe('tables', () => {
  const { registry } = load()

  it('resolves ranges with structured values and inline dice', () => {
    // d6 → 1 (wolves), then 2d6 → 3 + 4 for the count
    const engine = createOracleEngine({ registry, random: faces(6, 1, 3, 4) })
    const { resolution } = engine.resolve('test/encounters')
    expect(resolution.entry).toBe('wolves')
    expect(resolution.value).toEqual({ count: 7, kind: 'beast' })
    expect(resolution.text).toBe('7 lobos')
  })

  it('follows nested tables and merges their values', () => {
    const engine = createOracleEngine({ registry, random: sequence([4.5 / 6, 0.75]) })
    const { resolution } = engine.resolve('test/encounters')
    expect(resolution.entry).toBe('ruin')
    expect(resolution.value).toEqual({ site: 'crypt' })
    expect(resolution.text).toBe('Cripta')
    expect(resolution.children).toHaveLength(1)
  })

  it('resolves references through aliases and dependencies', () => {
    const engine = createOracleEngine({ registry, random: sequence([5.5 / 6, 0.1]) })
    const { resolution } = engine.resolve('test/encounters')
    expect(resolution.children[0].source).toBe('core/weather')
    expect(resolution.text).toBe('Clear')
  })

  it('picks weighted entries by weight', () => {
    const engine = createOracleEngine({ registry, random: sequence([0.7, 0.8]) })
    expect(engine.resolve('core/weather').resolution.entry).toBe('clear')
    expect(engine.resolve('core/weather').resolution.entry).toBe('rain')
  })

  it('applies context modifiers and clamps out-of-range totals', () => {
    const engine = createOracleEngine({ registry, random: faces(6, 1, 1, 6, 6) })
    expect(engine.resolve('test/reaction', { pre: -2 }).resolution.entry).toBe('hostile') // 2-2 → clamps low
    expect(engine.resolve('test/reaction', { pre: 3 }).resolution.entry).toBe('friendly') // 15 → clamps high
  })

  it('rolls with a roll mode the table offers', () => {
    const engine = createOracleEngine({ registry, random: faces(6, 1, 1, 5, 5) })
    const mode = { mode: 'test/advantage' }
    const { resolution } = engine.resolve('test/reaction', { pre: 0 }, undefined, mode)
    expect(resolution.entry).toBe('friendly')
    expect(resolution.mode).toBe('test/advantage')
    expect(resolution.rolls[0].discarded?.map((d) => d.total)).toEqual([2])
    // A mode the table doesn't offer isn't used.
    const plain = engine.resolve('test/terrain-encounter', {}, undefined, mode).resolution
    expect(plain.mode).toBeUndefined()
  })

  it('filters entries by conditions on the context', () => {
    const engine = createOracleEngine({ registry, random: seeded(1) })
    expect(engine.resolve('test/terrain-encounter', { terrain: 'desert' }).resolution.text).toBe(
      'Escorpiones',
    )
    expect(
      engine.resolve('test/terrain-encounter', { terrain: 'sea' }).resolution.entry,
    ).toBeUndefined()
  })

  it('resolves dynamic references from the context', () => {
    const engine = createOracleEngine({ registry, random: seeded(1) })
    expect(engine.resolve('test/weather-by-season', { season: 'winter' }).resolution.text).toBe(
      'Nieve',
    )
    expect(() => engine.resolve('test/weather-by-season', { season: 'summer' })).toThrow(
      OracleError,
    )
  })

  it('treats missing roll values as 0 but rejects non-numbers', () => {
    const engine = createOracleEngine({ registry, random: faces(6, 4, 4) })
    expect(engine.resolve('test/reaction', {}).resolution.entry).toBe('neutral') // 8 + 0
    expect(() => engine.resolve('test/reaction', { pre: 'two' })).toThrow(/needs a number/)
  })

  it('honors once-only entries through the state', () => {
    const engine = createOracleEngine({ registry, random: faces(2, 1, 1) })
    const first = engine.resolve('test/unique')
    expect(first.resolution.entry).toBe('dragon')
    const second = engine.resolve('test/unique', {}, first.state)
    expect(second.resolution.entry).toBe('rats') // onExhausted: next
    expect(second.state.occurrences['test/unique#dragon']).toBe(1)
    expect(engine.reset('test/unique', second.state).occurrences).toEqual({})
  })

  it('is reproducible with the same seed', () => {
    const a = createOracleEngine({ registry, random: seeded('kal-arath') })
    const b = createOracleEngine({ registry, random: seeded('kal-arath') })
    for (let i = 0; i < 5; i++)
      expect(a.resolve('test/encounters').resolution.value).toEqual(
        b.resolve('test/encounters').resolution.value,
      )
  })
})

describe('nested values', () => {
  it('fill in templates inside maps, and the text reads the value rolled', () => {
    const { registry } = load([
      {
        path: 'test/nested.yaml',
        content: `
kind: table
id: found
entries:
  - { result: 'Food for {{resources.food}} days', set: { resources: { food: '{{1d3+1}}' }, tags: [a, b] } }
`,
      },
    ])
    // The weighted pick takes one value, then the d3 shows 2.
    const engine = createOracleEngine({ registry, random: sequence([0.1, 1.5 / 3]) })
    const { resolution } = engine.resolve('test/found')
    expect(resolution.value).toEqual({ resources: { food: 3 }, tags: ['a', 'b'] })
    expect(resolution.text).toBe('Food for 3 days')
  })
})

describe('oracles', () => {
  const { registry } = load()

  it('picks the variant from the input, with a default', () => {
    const engine = createOracleEngine({ registry, random: sequence([0.6, 0.6]) })
    expect(engine.resolve('core/yes-no', { likelihood: 'likely' }).resolution.value).toEqual({
      likelihood: 'likely',
      answer: 'yes',
    })
    expect(engine.resolve('core/yes-no').resolution.value).toEqual({
      likelihood: 'even',
      answer: 'no',
    })
  })
})

describe('once-only oracle entries', () => {
  const { registry } = load([
    {
      path: 'test/oracle-once.yaml',
      content: `
kind: oracle
id: omen
inputs:
  mood: { options: [dark, bright] }
variants:
  dark:
    entries:
      - { result: Raven, once: true }
      - { result: Crow }
  bright:
    entries:
      - { result: Dove, once: true }
      - { result: Lark }
`,
    },
  ])

  it('count each variant on its own when entries have no id', () => {
    // 0.1 picks the first entry; a pick of an exhausted one is rerolled (0.9 → the second).
    const engine = createOracleEngine({ registry, random: sequence([0.1, 0.1, 0.1, 0.9]) })
    const dark = engine.resolve('test/omen', { mood: 'dark' })
    expect(dark.resolution.text).toBe('Raven')
    const bright = engine.resolve('test/omen', { mood: 'bright' }, dark.state)
    expect(bright.resolution.text).toBe('Dove')
    const again = engine.resolve('test/omen', { mood: 'dark' }, bright.state)
    expect(again.resolution.text).toBe('Crow')
  })
})

describe('generators', () => {
  const { registry } = load()

  it('resolves fields in order with conditions, context and a template', () => {
    // check d6=5 → encounter d6=3 (traders) → reaction 2d6=4+4 + pre 1 = 9 (neutral)
    const engine = createOracleEngine({ registry, random: faces(6, 5, 3, 4, 4) })
    const { resolution, record } = engine.resolve('test/encounter-check', { pre: 1 })
    expect(resolution.value.check).toBe(5)
    expect(resolution.value.encounter).toEqual({ kind: 'humans', text: 'Mercaderes' })
    expect(resolution.value.reaction).toEqual({ text: 'Neutral' })
    expect(resolution.text).toBe('Mercaderes (Neutral)')
    expect(record.rolls.map((r) => r.total)).toEqual([5, 3, 9])
  })

  it('skips fields whose condition fails', () => {
    const engine = createOracleEngine({ registry, random: faces(6, 2) })
    const { resolution } = engine.resolve('test/encounter-check', { pre: 0 })
    expect(resolution.value).toEqual({ check: 2 })
    expect(resolution.text).toBe(' ()')
  })
})

describe('decks', () => {
  const { registry } = load()

  it('draws without replacement and reshuffles when empty', () => {
    const engine = createOracleEngine({ registry, random: seeded(5) })
    let state = emptyState()
    const drawn: string[] = []
    for (let i = 0; i < 3; i++) {
      const outcome = engine.draw('test/events', state)
      drawn.push(outcome.resolution.entry!)
      state = outcome.state
    }
    expect(drawn.sort()).toEqual(['ambush', 'storm', 'storm'])
    expect(state.decks['test/events']).toEqual({ draw: [], discard: expect.any(Array) })
    const fourth = engine.draw('test/events', state)
    expect(fourth.state.decks['test/events'].draw).toHaveLength(2)
  })

  it('reports an empty manual deck until shuffled', () => {
    const engine = createOracleEngine({ registry, random: seeded(5) })
    const first = engine.draw('test/one-shot')
    expect(first.resolution.text).toBe('Única')
    const second = engine.draw('test/one-shot', first.state)
    expect(second.resolution.value).toEqual({ empty: true })
    const shuffled = engine.shuffle('test/one-shot', second.state)
    expect(engine.draw('test/one-shot', shuffled).resolution.text).toBe('Única')
  })

  it('keeps working after the deck is edited', () => {
    const engine = createOracleEngine({ registry, random: seeded(5) })
    // Saved piles mention a card that no longer exists and lack the ambush card.
    const state: OracleState = {
      ...emptyState(),
      decks: { 'test/events': { draw: ['gone', 'storm'], discard: ['storm'] } },
    }
    const drawn: string[] = []
    let current = state
    for (let i = 0; i < 2; i++) {
      const outcome = engine.draw('test/events', current)
      drawn.push(outcome.resolution.entry!)
      current = outcome.state
    }
    expect(drawn.sort()).toEqual(['ambush', 'storm'])
    expect(current.decks['test/events'].draw).toEqual([])
    expect(current.decks['test/events'].discard.sort()).toEqual(['ambush', 'storm', 'storm'])
  })

  it('refuses to draw from something that is not a deck', () => {
    const engine = createOracleEngine({ registry, random: seeded(5) })
    expect(() => engine.draw('test/encounters')).toThrow(OracleError)
  })
})

describe('localization', () => {
  const { registry } = load()

  it('uses translations and falls back to the base locale per string', () => {
    const engine = createOracleEngine({ registry, random: faces(6, 1, 3, 4), locale: 'en' })
    expect(engine.resolve('test/encounters').resolution.text).toBe('7 wolves')

    const crypt = createOracleEngine({ registry, random: sequence([4.5 / 6, 0.75]), locale: 'en' })
    expect(crypt.resolve('test/encounters').resolution.text).toBe('Cripta') // no translation for crypt

    const gen = createOracleEngine({ registry, random: faces(6, 5, 3, 4, 4), locale: 'en' })
    expect(gen.resolve('test/encounter-check', { pre: 1 }).resolution.text).toBe(
      'Traders [Neutral]',
    )
  })

  it('can switch locale per call', () => {
    const engine = createOracleEngine({ registry, random: faces(6, 3, 3), locale: 'en' })
    expect(engine.resolve('test/encounters').resolution.text).toBe('Traders')
    expect(engine.resolve('test/encounters', {}, undefined, { locale: 'es' }).resolution.text).toBe(
      'Mercaderes',
    )
  })
})

describe('safety', () => {
  it('stops runaway recursion with maxDepth', () => {
    const { registry } = loadPacks([
      { path: 'r/pack.yaml', content: 'id: r\nversion: 0.1.0\nlocale: en\n' },
      { path: 'r/t.yaml', content: "kind: table\nid: self\nentries:\n  - { table: '{{next}}' }\n" },
    ])
    const engine = createOracleEngine({ registry, random: seeded(1), maxDepth: 5 })
    expect(() => engine.resolve('r/self', { next: 'self' })).toThrow(/Maximum depth/)
  })

  it('treats templates as data, never code', () => {
    const { registry } = loadPacks([
      { path: 'x/pack.yaml', content: 'id: x\nversion: 0.1.0\nlocale: en\n' },
      {
        path: 'x/t.yaml',
        content:
          "kind: table\nid: t\nentries:\n  - { result: '{{constructor.constructor}}{{alert(1)}}' }\n",
      },
    ])
    const engine = createOracleEngine({ registry, random: seeded(1) })
    expect(engine.resolve('x/t').resolution.text).toBe('')
  })
})

describe('oracle input labels', () => {
  const pack: PackFile[] = [
    { path: 'lab/pack.yaml', content: 'id: lab\nversion: 0.1.0\nlocale: en\n' },
    {
      path: 'lab/oracles.yaml',
      content: `
kind: oracle
id: mood
inputs:
  attitude:
    label: Attitude
    options: [hostile, friendly]
    labels: { hostile: Hostile, ghost: Nobody }
variants:
  hostile: { entries: [{ id: a, weight: 1, result: Attacks }] }
  friendly: { entries: [{ id: a, weight: 1, result: Helps }] }
`,
    },
    {
      path: 'lab/locales/es/oracles.yaml',
      content: `
mood:
  inputs:
    attitude: { label: Actitud, labels: { hostile: Hostil } }
`,
    },
  ]

  it('keeps labels, translates them and warns about unknown options', () => {
    const { registry, diagnostics } = loadPacks(pack)
    const def = registry.definitions.get('lab/mood')
    expect(def?.kind === 'oracle' && def.inputs.attitude.label).toBe('Attitude')
    expect(registry.overlays.get('es')?.get('lab/mood')?.inputs?.attitude).toEqual({
      label: 'Actitud',
      labels: { hostile: 'Hostil' },
    })
    expect(diagnostics.map(formatDiagnostic)).toEqual([
      expect.stringContaining('Label for unknown option "ghost"'),
    ])
  })
})

describe('roll modes', () => {
  const pack = (body: string) =>
    loadPacks([
      { path: 'm/pack.yaml', content: 'id: m\nversion: 0.1.0\nlocale: en\n' },
      { path: 'm/t.yaml', content: body },
    ])
  const modes = `
kind: roll-modes
modes:
  advantage: { name: { en: Advantage, es: Ventaja }, repeat: 2, keep: highest, cancels: disadvantage }
  disadvantage: { name: Disadvantage, repeat: 2, keep: lowest }
  steady: { name: Steady, repeat: 3, keep: middle }
`

  it('are declared by packs, with names, and referenced by tables', () => {
    const { registry, diagnostics } = pack(`${modes}
---
kind: table
id: t
roll: 1d6
modes: [advantage, steady, nope]
modeWhen: { disadvantage: { tired: true } }
entries: [{ range: 1-6, result: X }]
---
kind: table
id: old
roll: 1d6
advantage: true
entries: [{ range: 1-6, result: X }]
`)
    expect(diagnostics.map((d) => [d.severity, d.at, d.message])).toEqual([
      ['error', 't.modes[2]', 'Unknown roll mode "nope"'],
      ['warning', 'old.advantage', expect.stringContaining('no longer does anything')],
    ])
    expect(registry.rollModes.get('m/advantage')).toMatchObject({
      name: { en: 'Advantage', es: 'Ventaja' },
      repeat: 2,
      keep: 'highest',
      cancels: ['m/disadvantage'],
    })
    const t = registry.definitions.get('m/t')
    expect(t?.kind === 'table' && [t.modes, Object.keys(t.modeWhen)]).toEqual([
      ['m/advantage', 'm/steady'],
      ['m/disadvantage'],
    ])
  })

  it('apply by themselves on a condition, and cancelling ones drop out', () => {
    const { registry } = pack(`${modes}
---
kind: table
id: forage
roll: 1d6
modes: [advantage, disadvantage, steady]
modeWhen:
  advantage: { explorer: { gte: 1 } }
  disadvantage: { yesterday.lost: true }
entries: [{ range: 1-6, result: X }]
`)
    const engine = createOracleEngine({ registry, random: seeded('modes') })
    const mode = (context: Record<string, unknown>, chosen?: string) =>
      engine.resolve('m/forage', context, undefined, { mode: chosen }).resolution.mode
    expect(mode({})).toBeUndefined()
    expect(mode({ explorer: 1 })).toBe('m/advantage')
    expect(mode({ yesterday: { lost: true } })).toBe('m/disadvantage')
    expect(mode({ explorer: 1, yesterday: { lost: true } })).toBeUndefined()
    // Chosen by hand: the three rolls of "steady" keep the middle one.
    const steady = engine.resolve('m/forage', {}, undefined, { mode: 'm/steady' }).resolution
    expect(steady.rolls[0].discarded).toHaveLength(2)
    // Chosen advantage and automatic disadvantage cancel out.
    expect(mode({ yesterday: { lost: true } }, 'm/advantage')).toBeUndefined()
  })
})

describe('YAML syntax errors', () => {
  it('carry the line where they are', () => {
    const { diagnostics } = loadPacks([
      { path: 'bad/pack.yaml', content: 'id: bad\nversion: 0.1.0\nlocale: en\n' },
      {
        path: 'bad/t.yaml',
        content: 'kind: table\nid: t\nentries:\n  - { result: A }\n  - { result: B\n',
      },
    ])
    expect(diagnostics.length).toBeGreaterThan(0)
    expect(diagnostics[0]).toMatchObject({ file: 'bad/t.yaml' })
    expect(diagnostics[0].line).toBe(5)
    expect(diagnostics[0].message).not.toContain('\n')
  })
})

describe('translations of definitions that are not tables', () => {
  it('fold into them as texts in several languages, keyed by kind/id', () => {
    const { registry, diagnostics } = loadPacks([
      { path: 'sys/pack.yaml', content: 'id: sys\nversion: 0.1.0\nlocale: en\n' },
      {
        path: 'sys/rules.yaml',
        content: `kind: calendar
id: reckoning
name: The reckoning
months:
  - { id: thaw, name: Thaw, days: 30 }
  - { id: sun, name: { en: Sun, fr: Soleil }, days: 30 }
---
kind: travel-rules
id: default
actions:
  forage: { name: Forage, nothing: 'nothing on {terrain}' }
checks:
  - { event: FORAGE, name: Foraging, at: forage }
`,
      },
      {
        path: 'sys/locales/es/rules.yaml',
        content: `calendar/reckoning:
  name: El cómputo
  months: { thaw: Deshielo, sun: { name: Sol }, ghost: Nada }
travel-rules/default:
  actions:
    forage: { name: Buscar comida, nothing: 'nada en {terrain}' }
  checks:
    FORAGE: { name: Buscar comida }
tables-are-still-here: { name: X }
calendar/nope: { name: Y }
`,
      },
    ])
    const extras = registry.extras.get('sys')!
    const calendar = extras.find((e) => e.kind === 'calendar')!.data
    expect(calendar.name).toEqual({ en: 'The reckoning', es: 'El cómputo' })
    expect(calendar.months).toEqual([
      { id: 'thaw', name: { en: 'Thaw', es: 'Deshielo' }, days: 30 },
      { id: 'sun', name: { en: 'Sun', fr: 'Soleil', es: 'Sol' }, days: 30 },
    ])
    const rules = extras.find((e) => e.kind === 'travel-rules')!.data as {
      actions: Record<string, unknown>
      checks: unknown[]
    }
    expect(rules.actions.forage).toEqual({
      name: { en: 'Forage', es: 'Buscar comida' },
      nothing: { en: 'nothing on {terrain}', es: 'nada en {terrain}' },
    })
    expect(rules.checks[0]).toMatchObject({ name: { en: 'Foraging', es: 'Buscar comida' } })
    expect(diagnostics.map((d) => d.message)).toEqual([
      'Translation of "calendar/reckoning" for something it doesn\'t have: months.ghost',
      'Translation for unknown definition "calendar/nope"',
      'Translation for unknown definition "tables-are-still-here"',
    ])
  })
})

describe('effects', () => {
  it('fill in their templates and add up with the tables they roll', () => {
    const { registry, diagnostics } = loadPacks([
      { path: 'fx/pack.yaml', content: 'id: fx\nversion: 0.1.0\nlocale: en\n' },
      {
        path: 'fx/t.yaml',
        content: `kind: table
id: forage
entries:
  - { result: 'Game: {{result}}', table: hunt, effects: { party.resources.food: '{{1d1+1}}', party.stats.morale: 1 } }
---
kind: table
id: hunt
entries:
  - { result: a deer, effects: { party.resources.food: 1, party.stats.fatigue: '=0' } }
---
kind: deck
id: omens
cards: [{ id: cache, result: A cache, effects: { party.resources.food: 2 } }]
`,
      },
    ])
    expect(diagnostics).toEqual([])
    const engine = createOracleEngine({ registry, random: seeded('fx') })
    expect(engine.resolve('fx/forage').resolution.value.effects).toEqual({
      'party.resources.food': 3,
      'party.stats.fatigue': '=0',
      'party.stats.morale': 1,
    })
    expect(engine.draw('fx/omens').resolution.value.effects).toEqual({
      'party.resources.food': 2,
    })
  })
})
