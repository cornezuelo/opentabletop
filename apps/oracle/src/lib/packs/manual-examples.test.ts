import { createOracleEngine, formatDiagnostic, loadPacks } from '@open-tabletop/oracle-engine'
import { seeded } from '@open-tabletop/random'
import {
  calendarOf,
  startTrip,
  stepTrip,
  travelSystems,
  type SessionState,
} from '@open-tabletop/session'
import type { TravelWorld } from '@open-tabletop/travel-engine'
import { describe, expect, it } from 'vitest'

/**
 * The definitions the manual shows as examples are real: each YAML block with a `kind:`
 * loads, as a pack of its own, with no problem other than tables, models or modes it names
 * that another example (or another pack) holds.
 */

/** The manual's pages, by path from `docs/manual/` (`en/systems/02-making-a-system.md`). */
const files = Object.fromEntries(
  Object.entries(
    import.meta.glob('../../../../../docs/manual/**/*.md', {
      query: '?raw',
      import: 'default',
      eager: true,
    }) as Record<string, string>,
  ).map(([path, text]) => [path.replace(/^.*docs\/manual\//, ''), text]),
)
const read = (path: string) => files[path]
const pages = (locale: string) => Object.keys(files).filter((f) => f.startsWith(`${locale}/`))
/** Whole examples: excerpts that leave parts out (`…`) aren't loaded. */
const examples = (text: string) =>
  [...text.matchAll(/```yaml\n([\s\S]*?)```/g)]
    .map((m) => m[1])
    .filter((y) => /^kind: /m.test(y) && !y.includes('…'))
const kindOf = (yaml: string) => /^kind: ([\w-]+)/m.exec(yaml)![1]

/** Problems of an example, without the references it leaves to others. */
function problems(files: string[]): string[] {
  const { registry, diagnostics } = loadPacks([
    { path: 'ex/pack.yaml', content: 'id: ex\nversion: 0.1.0\nlocale: en\n' },
    ...files.map((content, i) => ({ path: `ex/defs-${i}.yaml`, content })),
  ])
  return [...diagnostics, ...travelSystems(registry).problems].map(formatDiagnostic).filter(
    (p) =>
      !/Unknown (table or generator|table|generator|weather model|roll mode|travel rules|bindings|calendar) "[\w/-]+"$/.test(
        p,
      ) &&
      !/"[\w-]+" isn't a dependency of this pack$/.test(p) &&
      // A page can't bring the map files its example names.
      !/No map "[\w/.-]+" in this pack$/.test(p),
  )
}

describe.each(['en', 'es'])('the manual’s examples (%s)', (locale) => {
  const kinds = examples(read(`${locale}/technical/07-kinds.md`))

  it('Kinds of definition shows every kind', () => {
    expect(new Set(kinds.map(kindOf))).toEqual(
      new Set([
        'table',
        'oracle',
        'generator',
        'deck',
        'roll-modes',
        'travel-rules',
        'bindings',
        'calendar',
        'weather',
        'system',
      ]),
    )
  })

  // Travel rules come with the page's bindings, as in a system (their stats).
  const bindings = kinds.find((y) => kindOf(y) === 'bindings')!
  const all = pages(locale).flatMap((page) =>
    examples(read(page)).map((yaml, i) => [`${page} #${i + 1} (${kindOf(yaml)})`, yaml]),
  )

  it.each(all)('%s loads', (_, yaml) => {
    const withBindings =
      kindOf(yaml) === 'travel-rules' && !/^kind: bindings/m.test(yaml) ? [yaml, bindings] : [yaml]
    expect(problems(withBindings)).toEqual([])
  })
})

describe('Travel → Making a system: the step-by-step system plays as the manual says', () => {
  const yaml = examples(read('en/systems/02-making-a-system.md')).find((y) =>
    y.includes('dark-lost'),
  )!
  const { registry } = loadPacks([
    { path: 'dark/pack.yaml', content: 'id: dark\nversion: 0.1.0\nlocale: en\n' },
    { path: 'dark/travel.yaml', content: yaml },
  ])
  const system = travelSystems(registry).systems.find((s) => s.id === 'dark')!
  // Three 30 km hexes: plains, forest, plains.
  const terrains = ['plains', 'forest', 'plains']
  const world: TravelWorld = {
    hexKm: 30,
    cell: (hex) => (terrains[Number(hex)] ? { terrain: terrains[Number(hex)] } : null),
    neighbors: (hex) => [Number(hex) - 1, Number(hex) + 1].filter((i) => terrains[i]).map(String),
    distance: (a, b) => Math.abs(Number(a) - Number(b)),
    edges: () => [],
  }
  const options = (seed: string) => ({
    system,
    world,
    oracle: createOracleEngine({ registry, random: seeded(seed) }),
    locale: 'en',
    random: seeded(seed),
  })
  const start = (torches: number): SessionState => {
    const { session } = startTrip({ system, location: '0', season: 'summer' })
    return { ...session, travel: { ...session.travel, resources: { food: 5, torches } } }
  }
  const nextDawn = (s: SessionState) =>
    calendarOf(system).at(s.travel.day + 1, system.rules.day.start)

  it('burns a torch a day; without torches the day tires the party (steps 2, 3, 6)', () => {
    let s = start(1)
    expect(s.stats.fatigue).toBe(0)
    s = stepTrip(options('torch'), s, { type: 'wait', until: nextDawn(s) }).state
    expect(s.travel.resources).toEqual({ food: 4, torches: 0 })
    expect(s.stats.fatigue).toBe(0)
    s = stepTrip(options('torch'), s, { type: 'wait', until: nextDawn(s) }).state
    expect(s.travel.resources.torches).toBe(0)
    expect(s.stats.fatigue).toBe(1)
  })

  it('rests only when tired (step 7)', () => {
    const fresh = start(1)
    const tried = stepTrip(options('rest'), fresh, { type: 'action', id: 'rest' }).state
    expect(tried.travel.time).toBe(fresh.travel.time)
    const tired = { ...fresh, stats: { ...fresh.stats, fatigue: 2 } }
    const rested = stepTrip(options('rest'), tired, { type: 'action', id: 'rest' }).state
    expect(rested.travel.time).toBe(fresh.travel.time + 120)
    expect(rested.stats.fatigue).toBe(1)
  })

  it('rolls getting lost at dawn only in the forest, and being lost stops the day (steps 4, 5)', () => {
    const rolled = (s: SessionState) =>
      s.journal.filter((e) => e.code === 'ORACLE_RESULT' && e.data?.event === 'LOST_CHECK')
    for (const seed of ['a', 'b', 'c', 'd', 'e', 'f']) {
      // One roller for the whole trip, as an app keeps.
      const opts = options(seed)
      let s = start(9)
      s = stepTrip(opts, s, { type: 'setDestination', hex: '2' }).state
      // Day 1 on the plains: no roll; then dawn in the forest.
      for (let i = 0; i < 40 && s.travel.location !== '2'; i++) {
        const day = s.travel.day
        s = stepTrip(opts, s, { type: 'travel' }).state
        if (s.travel.day === day) s = stepTrip(opts, s, { type: 'wait', until: nextDawn(s) }).state
      }
      expect(s.travel.location).toBe('2')
      const lost = rolled(s)
      expect(lost.length).toBeGreaterThan(0)
      // Never on the plains: the first roll comes after entering the forest (hex 1).
      const forest = s.journal.find((e) => e.code === 'HEX_ENTERED' && e.data?.hex === '1')!
      expect(lost[0].time).toBeGreaterThan(forest.time)
      // A lost day stops the march that day, and the journal says why.
      if (lost.some((e) => (e.data?.value as { lost?: boolean })?.lost))
        expect(s.journal.some((e) => e.code === 'TRAVEL_STOPPED' && e.data?.value === 'lost')).toBe(
          true,
        )
    }
  })
})
