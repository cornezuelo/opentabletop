import { createOracleEngine, formatDiagnostic, loadPacks } from '@open-tabletop/oracle-engine'
import { seeded } from '@open-tabletop/random'
import {
  applyMemberEffects,
  calendarOf,
  newMember,
  partyOf,
  refreshParty,
  startTrip,
  stepTrip,
  tripAvailability,
  travelSystems,
  type SessionState,
} from '@open-tabletop/session'
import { tripStart, type TravelWorld } from '@open-tabletop/travel-engine'
import { parseFactions } from '@open-tabletop/faction-engine'
import { weatherShares, type HexFlower, type WeatherModel } from '@open-tabletop/weather-engine'
import { describe, expect, it } from 'vitest'
import { parse, parseAllDocuments, stringify } from 'yaml'

/**
 * The definitions the manual shows as examples are real: each YAML block with a `kind:`
 * loads, as a pack of its own, with no problem other than tables, models or modes it names
 * that another example (or another pack) holds.
 */

/** The manual's pages, by path from `docs/manual/` (`en/systems/03-your-first-system.md`). */
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
    { path: 'ex/pack.yaml', content: 'id: ex\nversion: 0.1.0\nformat: 6\nlocale: en\n' },
    ...files.map((content, i) => ({ path: `ex/defs-${i}.yaml`, content })),
  ])
  return [...diagnostics, ...travelSystems(registry).problems].map(formatDiagnostic).filter(
    (p) =>
      !/Unknown (table|weather model|roll mode|travel rules|bindings|calendar|sheet) "[\w/.-]+"$/.test(
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
        'sheet',
        'factions',
        'clocks',
      ]),
    )
  })

  // Travel rules come with the page's bindings and sheet, as in a system (their stats, some
  // made of the characters').
  const bindings = kinds.find((y) => kindOf(y) === 'bindings')!
  const sheet = kinds.find((y) => kindOf(y) === 'sheet')!
  const all = pages(locale).flatMap((page) =>
    examples(read(page)).map((yaml, i) => [`${page} #${i + 1} (${kindOf(yaml)})`, yaml]),
  )

  it.each(all)('%s loads', (_, yaml) => {
    const withBindings =
      kindOf(yaml) === 'travel-rules' && !/^kind: bindings/m.test(yaml)
        ? [yaml, bindings, sheet]
        : [yaml]
    expect(problems(withBindings)).toEqual([])
    // Factions are read by a system: on their own, their shape is checked here.
    if (kindOf(yaml) === 'factions') expect(parseFactions(parse(yaml)).errors).toEqual([])
  })
})

describe('Systems → Your first system: the step-by-step system plays as the manual says', () => {
  const yaml = examples(read('en/systems/03-your-first-system.md')).find((y) =>
    y.includes('dark-lost'),
  )!
  const { registry } = loadPacks([
    { path: 'dark/pack.yaml', content: 'id: dark\nversion: 0.1.0\nformat: 6\nlocale: en\n' },
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
    calendarOf(system).at(s.travel.day + 1, tripStart(system.rules, calendarOf(system)))

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

describe('Technical → Actions and steps: the river crossing plays as the page says', () => {
  const yaml = examples(read('en/technical/10-actions-and-steps.md')).find((y) =>
    y.includes('river-crossing'),
  )!
  const { registry } = loadPacks([
    { path: 'river/pack.yaml', content: 'id: river\nversion: 0.1.0\nformat: 6\nlocale: en\n' },
    { path: 'river/travel.yaml', content: yaml },
  ])
  const system = travelSystems(registry).systems.find((s) => s.id === 'river')!
  const world: TravelWorld = {
    hexKm: 30,
    cell: (hex) => (['0', '1'].includes(hex) ? { terrain: 'plains' } : null),
    neighbors: (hex) => (hex === '0' ? ['1'] : ['0']),
    distance: (a, b) => Math.abs(Number(a) - Number(b)),
    edges: () => [],
  }
  const options = { system, world, locale: 'en', random: seeded('river') }
  const calendar = calendarOf(system)
  const start = (): SessionState => {
    const { session } = startTrip({ system, location: '0', season: 'summer' })
    const time = calendar.at(session.travel.day, '08:00')
    return { ...session, travel: { ...session.travel, time, resources: { food: 5 } } }
  }
  const lines = (s: SessionState) => s.journal.map((e) => e.code)

  it('asks how, then waits for the ferry until noon, says so and pauses (steps 1, 2)', () => {
    let s = stepTrip(options, start(), { type: 'action', id: 'cross' }).state
    expect(s.travel.waiting).toMatchObject({ action: 'cross', ask: 'how' })
    s = stepTrip(options, s, { type: 'resume', choice: 'ferry' }).state
    expect(calendar.describe(s.travel.time)).toMatchObject({ hour: 12, minute: 0 })
    expect(s.journal.find((e) => e.code === 'SAID')?.data?.text).toBe(
      'Ready to cross, 5 food left.',
    )
    expect(s.travel.waiting).toMatchObject({ action: 'cross' })
    s = stepTrip(options, s, { type: 'resume' }).state
    expect(s.travel.waiting).toBeUndefined()
    expect(lines(s)).toEqual(expect.arrayContaining(['HELD', 'RESUMED', 'SAID']))
  })

  it('or builds a raft in three hours and travels by raft (step 3)', () => {
    let s = stepTrip(options, start(), { type: 'action', id: 'cross' }).state
    s = stepTrip(options, s, { type: 'resume', choice: 'raft' }).state
    expect(calendar.describe(s.travel.time)).toMatchObject({ hour: 11, minute: 0 })
    expect(s.travel.mode).toBe('raft')
    expect(lines(s)).toContain('MODE_CHANGED')
  })
})

/** A file of Core, as bundled (`travel.yaml`): what a new system starts from. */
const coreFile = (file: string) =>
  (
    import.meta.glob('../../../../../packs/core/*.yaml', {
      query: '?raw',
      import: 'default',
      eager: true,
    }) as Record<string, string>
  )[`../../../../../packs/core/${file}`]

describe('Systems → Weather: the valley’s weather plays as the page says', () => {
  const model = examples(read('en/systems/11-weather.md')).find((y) => y.includes('Valley skies'))!
  // A new system: a copy of the Generic rules and Core's calendar, with what steps 5 and 6
  // add, and a check an hour after the weather's that reads it (Common mistakes).
  const core = coreFile
  const rules = parse(core('travel.yaml'))
  rules.weather = { rain: { speed: 0.75 }, snow: { speed: 0.5 }, storm: { speed: 0 } }
  rules.values = { 'deep-snow': { name: 'Deep snow', blocks: ['modes.horse'] } }
  rules.checks = [
    { event: 'WEATHER', name: 'Weather', at: 'time.part.morning' },
    { event: 'WET', at: '07:00', when: { 'trip.weather': 'rain' } },
  ]
  const { registry, diagnostics } = loadPacks([
    { path: 'valley/pack.yaml', content: 'id: valley\nversion: 0.1.0\nformat: 6\nlocale: en\n' },
    { path: 'valley/travel.yaml', content: stringify(rules) },
    { path: 'valley/calendar.yaml', content: core('calendar.yaml') },
    { path: 'valley/weather.yaml', content: model },
    {
      path: 'valley/system.yaml',
      content: [
        'kind: bindings\nid: default\non:\n  WEATHER: { weather: weather.weather }',
        'kind: system\nid: default\nname: Valley\ntravel: travel-rules.default\nbindings: bindings.default\ncalendar: calendar.default\nweather: [weather.weather]',
      ].join('\n---\n'),
    },
  ])
  const system = travelSystems(registry).systems.find((s) => s.pack === 'valley')!
  const skies = parse(model) as WeatherModel
  // A long row of plains.
  const world: TravelWorld = {
    hexKm: 10,
    cell: (hex) => (Number(hex) >= 0 && Number(hex) < 200 ? { terrain: 'plains' } : null),
    neighbors: (hex) => [Number(hex) - 1, Number(hex) + 1].filter((i) => i >= 0).map(String),
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
  const nextDawn = (s: SessionState) =>
    calendarOf(system).at(s.travel.day + 1, tripStart(system.rules, calendarOf(system)))
  /** Marches day after day towards the far end, and each day's weather and checks. */
  function play(season: string, seed: string, days: number) {
    const opts = options(seed)
    let s = startTrip({ system, location: '0', season }).session
    s = { ...s, travel: { ...s.travel, resources: { food: 99 } } }
    s = stepTrip(opts, s, { type: 'setDestination', hex: '199' }).state
    const seen: { weather: string; wet: boolean; travel: unknown; horse: unknown }[] = []
    for (let day = 0; day < days; day++) {
      const at = s.journal.length
      s = stepTrip(opts, s, { type: 'travel' }).state
      // Today's weather was rolled as the morning began (this step, or the wait before it).
      const weather = s.journal.findLast(
        (e) => e.code === 'ORACLE_RESULT' && e.data?.event === 'WEATHER',
      )!
      seen.push({
        weather: (weather.data?.value as { weather: string }).weather,
        wet: s.journal.some((e) => e.data?.event === 'WET' && e.time === weather.time + 60),
        travel: s.journal.slice(at).find((e) => e.code === 'TRAVEL_STOPPED')?.data?.reason,
        horse: tripAvailability({ system, world }, s)['mode.horse'],
      })
      s = stepTrip(opts, s, { type: 'wait', until: nextDawn(s) }).state
    }
    return seen
  }

  it('loads, and its seasons come up as Over many days says (steps 3, 4)', () => {
    expect(diagnostics.map(formatDiagnostic)).toEqual([])
    const shares = (season: string, m = skies) => weatherShares(m, season, 20000, seeded('valley'))
    const summer = shares('summer')
    expect(summer.clear).toBeCloseTo(0.73, 1)
    expect(summer.rain).toBeCloseTo(0.23, 1)
    expect(summer.storm).toBeCloseTo(0.05, 1)
    const winter = shares('winter')
    expect(winter.snow).toBeCloseTo(0.32, 1)
    expect(winter.clear).toBeCloseTo(0.32, 1)
    expect(winter.rain).toBeCloseTo(0.26, 1)
    expect(winter.storm).toBeCloseTo(0.11, 1)
    // Common mistakes: the same winter with "stays" at the edge sinks to the clear bottom.
    const { flower } = skies.seasons.winter as { flower: HexFlower }
    const staying: WeatherModel = {
      ...skies,
      seasons: { winter: { flower: { ...flower, edge: 'stay' } } },
    }
    expect(shares('winter', staying).clear).toBeGreaterThan(0.85)
  })

  it('in summer: fine spells, rain that slows, storms that stop the day and never last (steps 5, 6)', () => {
    const days = ['a', 'b', 'c', 'd'].flatMap((seed) => play('summer', seed, 30))
    const kinds = new Set(days.map((d) => d.weather))
    expect([...kinds].sort()).toEqual(['clear', 'rain', 'storm'])
    expect(days[0].weather).toBe('clear')
    for (const [i, d] of days.entries()) {
      // A check an hour after the weather's sees today's weather.
      expect(d.wet).toBe(d.weather === 'rain')
      if (d.weather === 'storm') {
        expect(d.travel).toBe('weather')
        if (i % 30 !== 29) expect(days[i + 1].weather).not.toBe('storm')
      }
    }
  })

  it('in winter: starts on snow, walks the flower, and deep snow leaves the horses behind (steps 4, 6)', () => {
    const days = play('winter', 'snowy', 40)
    expect(days[0].weather).toBe('snow')
    expect(new Set(days.map((d) => d.weather)).size).toBeGreaterThan(2)
    for (const d of days)
      if (d.weather === 'snow') expect(d.horse).toMatchObject({ value: 'deep-snow' })
      else expect(d.horse).toBeUndefined()
  })
})

describe('Systems → Rules: the caravan plays as the page says', () => {
  // What the steps add to the Generic rules (the page's excerpt), on a copy of them.
  const added = parse(
    [...read('en/systems/05-rules.md').matchAll(/```yaml\n([\s\S]*?)```/g)]
      .map((m) => m[1])
      .find((y) => y.includes('parched'))!,
  )
  const rules = parse(coreFile('travel.yaml'))
  for (const part of ['modes', 'terrains', 'resources', 'values', 'actions'])
    rules[part] = { ...rules[part], ...added[part] }
  const { registry, diagnostics } = loadPacks([
    { path: 'salt/pack.yaml', content: 'id: salt\nversion: 0.1.0\nformat: 6\nlocale: en\n' },
    { path: 'salt/travel.yaml', content: stringify(rules) },
    { path: 'salt/calendar.yaml', content: coreFile('calendar.yaml') },
    {
      path: 'salt/system.yaml',
      content:
        'kind: system\nid: default\nname: Salt Road\ntravel: travel-rules.default\ncalendar: calendar.default',
    },
  ])
  const system = travelSystems(registry).systems.find((s) => s.pack === 'salt')!
  const calendar = calendarOf(system)
  // Step 8's way: desert, a road from hex 2 to hex 3, the salt flat on hex 6, the oasis on 10.
  const terrains = [
    'desert',
    'desert',
    'desert',
    'desert',
    'desert',
    'salt-flat',
    'desert',
    'desert',
    'desert',
    'oasis',
  ]
  const world: TravelWorld = {
    hexKm: 10,
    cell: (hex) => (terrains[Number(hex)] ? { terrain: terrains[Number(hex)] } : null),
    neighbors: (hex) => [Number(hex) - 1, Number(hex) + 1].filter((i) => terrains[i]).map(String),
    distance: (a, b) => Math.abs(Number(a) - Number(b)),
    edges: (a, b) => ([a, b].sort().join() === '1,2' ? ['road'] : []),
  }
  const options = {
    system,
    world,
    oracle: createOracleEngine({ registry, random: seeded('salt') }),
    locale: 'en',
    random: seeded('salt'),
  }
  const clock = (s: SessionState, time = s.travel.time) => {
    const { hour, minute } = calendar.describe(time)
    return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
  }
  const nextDawn = (s: SessionState) =>
    calendar.at(s.travel.day + 1, tripStart(system.rules, calendar))
  /** A trip by camel towards the oasis (hex 10). */
  function setOut(season: string) {
    let s = startTrip({ system, location: '0', season }).session
    s = stepTrip(options, s, { type: 'setMode', mode: 'camel' }).state
    return stepTrip(options, s, { type: 'setDestination', hex: '9' }).state
  }
  /** A day's march: the hexes entered (1 is the first) at their clocks, and where it stopped. */
  function march(s: SessionState) {
    const at = s.journal.length
    s = stepTrip(options, s, { type: 'travel' }).state
    const lines = s.journal.slice(at)
    const entered = lines
      .filter((e) => e.code === 'HEX_ENTERED')
      .map((e) => `${Number(e.data?.hex) + 1} ${clock(s, e.time)}`)
    return { s, entered, stopped: lines.find((e) => e.code === 'TRAVEL_STOPPED')?.data, lines }
  }

  it('loads, and starts with the water its Max allows (steps 1–5)', () => {
    expect(diagnostics.map(formatDiagnostic)).toEqual([])
    const s = setOut('summer')
    expect(s.travel.resources).toEqual({ food: 6, water: 3 })
    expect(s.travel.route).toHaveLength(10)
  })

  it('in summer: two hexes a day by camel, faster along the road, until the water runs out (steps 2–8)', () => {
    let day = march(setOut('summer'))
    // Day 1: a drink as the morning begins; 4 h a desert hex, 1 h 20 min along the road.
    expect(day.lines.find((e) => e.code === 'ACTION_TAKEN')?.data?.action).toBe('drink')
    expect(day.entered).toEqual(['2 10:00', '3 11:20'])
    expect(day.stopped).toMatchObject({ reason: 'conditions', action: 'march' })
    expect(clock(day.s)).toBe('14:00')
    expect(day.s.travel.resources.water).toBe(2)
    let s = stepTrip(options, day.s, { type: 'wait', until: nextDawn(day.s) }).state
    // Day 2: the rest of hex 4, hex 5, and the salt flat at its own speed (2 h).
    day = march(s)
    expect(day.entered).toEqual(['4 07:20', '5 11:20', '6 13:20'])
    expect(day.s.travel.resources.water).toBe(1)
    s = stepTrip(options, day.s, { type: 'wait', until: nextDawn(day.s) }).state
    day = march(s)
    expect(day.entered).toEqual(['7 09:20', '8 13:20'])
    expect(day.s.travel.resources.water).toBe(0)
    s = stepTrip(options, day.s, { type: 'wait', until: nextDawn(day.s) }).state
    // Day 4: no water to drink: Parched, and the camels stay; on foot the party goes on.
    day = march(s)
    expect(day.entered).toEqual([])
    expect(day.s.journal.some((e) => e.code === 'LIMIT_REACHED')).toBe(true)
    expect(day.stopped).toMatchObject({ reason: 'value', value: 'parched', mode: 'camel' })
    expect(tripAvailability({ system, world }, day.s)['mode.camel']).toEqual({ value: 'parched' })
    s = stepTrip(options, day.s, { type: 'setMode', mode: 'foot' }).state
    // 5 h 20 min a hex of sand on foot, from where the camels stopped.
    day = march(s)
    expect(day.entered).toEqual(['9 10:40', '10 13:20'])
    s = day.s
    expect(s.travel.location).toBe('9')
    // At the oasis: the skins filled, never past their Max.
    s = stepTrip(options, s, { type: 'action', id: 'fill' }).state
    expect(s.travel.resources.water).toBe(3)
    s = stepTrip(options, s, { type: 'action', id: 'fill' }).state
    expect(s.travel.resources.water).toBe(3)
    expect(s.journal.at(-1)).toMatchObject({ code: 'LIMIT_REACHED' })
  })

  it('in spring the salt flat is closed: no route to the oasis (step 3)', () => {
    const s = setOut('spring')
    expect(s.travel.route).toBeUndefined()
    expect(s.journal.some((e) => e.code === 'NO_ROUTE')).toBe(true)
    expect(march(s).stopped).toMatchObject({ reason: 'no-route' })
  })
})

describe('Systems → Checks: wolf country plays as the page says', () => {
  // The page's excerpt (the rules' checks, then the bindings) and its table.
  const blocks = [...read('en/systems/06-checks.md').matchAll(/```yaml\n([\s\S]*?)```/g)].map(
    (m) => m[1],
  )
  const [added, bound] = parseAllDocuments(blocks.find((y) => y.includes('WOLVES_AT_NIGHT'))!).map(
    (d) => d.toJS(),
  )
  const table = blocks.find((y) => y.includes('kind: table'))!
  const rules = { ...parse(coreFile('travel.yaml')), checks: added.checks }
  const { registry, diagnostics } = loadPacks([
    { path: 'wolf/pack.yaml', content: 'id: wolf\nversion: 0.1.0\nformat: 6\nlocale: en\n' },
    {
      path: 'wolf/travel.yaml',
      content: `${stringify(rules)}---\n${stringify({ kind: 'bindings', id: 'default', ...bound })}`,
    },
    { path: 'wolf/tables.yaml', content: table },
    { path: 'wolf/calendar.yaml', content: coreFile('calendar.yaml') },
    {
      path: 'wolf/system.yaml',
      content:
        'kind: system\nid: default\nname: Wolf Country\ntravel: travel-rules.default\nbindings: bindings.default\ncalendar: calendar.default',
    },
  ])
  const system = travelSystems(registry).systems.find((s) => s.pack === 'wolf')!
  const calendar = calendarOf(system)
  // Step 8's way: the stones on hex 5, a road from hex 3 to hex 4.
  const terrains = ['plains', 'forest', 'forest', 'hills', 'plains', 'plains']
  const world: TravelWorld = {
    hexKm: 10,
    cell: (hex) =>
      terrains[Number(hex)]
        ? { terrain: terrains[Number(hex)], tags: hex === '4' ? ['landmark'] : [] }
        : null,
    neighbors: (hex) => [Number(hex) - 1, Number(hex) + 1].filter((i) => terrains[i]).map(String),
    distance: (a, b) => Math.abs(Number(a) - Number(b)),
    edges: (a, b) => ([a, b].sort().join() === '2,3' ? ['road'] : []),
  }
  const options = (seed: string) => ({
    system,
    world,
    oracle: createOracleEngine({ registry, random: seeded(seed) }),
    locale: 'en',
    random: seeded(seed),
  })
  const clock = (time: number) => {
    const { hour, minute } = calendar.describe(time)
    return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
  }
  const nextDawn = (s: SessionState) =>
    calendar.at(s.travel.day + 1, tripStart(system.rules, calendar))
  /** A trip with 1 food towards the far end (hex 6). */
  function setOut(opts: ReturnType<typeof options>) {
    let s = startTrip({ system, location: '0', season: 'summer' }).session
    s = { ...s, travel: { ...s.travel, resources: { food: 1 } } }
    return stepTrip(opts, s, { type: 'setDestination', hex: '5' }).state
  }
  /** Goes on from every check that waits, as Continue does. */
  const goOn = (opts: ReturnType<typeof options>, s: SessionState) => {
    while (s.travel.pendingChecks.length)
      s = stepTrip(opts, s, { type: 'resolveCheck', id: s.travel.pendingChecks[0].id }).state
    return s
  }
  const of = (s: SessionState, code: string, event?: string) =>
    s.journal.filter(
      (e) => e.code === code && (!event || e.data?.event === event || e.data?.check === event),
    )
  /** The dice of a check's rolls (`1d6 + 2 → 5  [3] +2`). */
  const dice = (s: SessionState, check: string) =>
    of(s, 'ROLLED', check).map((e) => (e.data?.rolls as { dice: string[] }[])[0].dice[0])

  it('loads (steps 1–7)', () => {
    expect(diagnostics.map(formatDiagnostic)).toEqual([])
    expect(system.bindings?.stats?.fatigue).toMatchObject({ default: 0 })
  })

  it('plays the way of step 8 as What you’ll see says', () => {
    const opts = options('wolf')
    let s = stepTrip(opts, setOut(opts), { type: 'travel' }).state
    // Day 1: wolves in the forest at 11:20, rolled with nothing added; a stop at 14:00.
    const wolves = of(s, 'ORACLE_RESULT', 'WOLVES')
    expect(wolves.map((e) => clock(e.time))).toEqual(['11:20'])
    expect(dice(s, 'WOLVES')[0]).toMatch(/^1d6 \+ 0 /)
    expect(clock(s.travel.time)).toBe('14:00')
    // The night in the forest: the same table, with 2 more (Continue goes on with the wait).
    s = goOn(opts, stepTrip(opts, s, { type: 'wait', until: nextDawn(s) }).state)
    expect(dice(s, 'WOLVES_AT_NIGHT')[0]).toMatch(/^1d6 \+ 2 /)
    expect(of(s, 'CHECK_SKIPPED', 'HUNGER')).toHaveLength(1)
    expect(clock(s.travel.time)).toBe('06:00')
    expect(s.travel.resources.food).toBe(0)
    // Day 2: the forest at 08:40; the hills by the road, skipped; the stones wait for you.
    const at = s.journal.length
    s = stepTrip(opts, s, { type: 'travel' }).state
    const day2 = s.journal.slice(at)
    expect(
      day2
        .filter((e) => e.code === 'ORACLE_RESULT' && e.data?.event === 'WOLVES')
        .map((e) => clock(e.time)),
    ).toEqual(['08:40'])
    expect(
      day2.find((e) => e.code === 'CHECK_SKIPPED' && e.data?.check === 'WOLVES'),
    ).toMatchObject({ data: { condition: 'unless', failed: [{ path: 'trip.edges' }] } })
    const stones = day2.find((e) => e.code === 'CHECK_PENDING')!
    expect(stones.data).toMatchObject({ event: 'OLD_STONES', hex: '4' })
    expect(clock(stones.time)).toBe('13:06')
    expect(s.travel.location).toBe('4')
    // Continue, then Go on (the march it stopped): it stops at 14:00.
    s = stepTrip(opts, goOn(opts, s), { type: 'travel' }).state
    expect(clock(s.travel.time)).toBe('14:00')
    // The night on the plains: no wolves; at midnight, nothing to eat, and Hunger tires.
    const fatigue = s.stats.fatigue
    s = stepTrip(opts, s, { type: 'wait', until: nextDawn(s) }).state
    expect(of(s, 'ROLLED', 'WOLVES_AT_NIGHT')).toHaveLength(1)
    expect(of(s, 'LIMIT_REACHED').at(-1)?.data).toMatchObject({ path: 'party.resources.food' })
    expect(of(s, 'CHECK_EFFECTS', 'HUNGER')).toHaveLength(1)
    expect(s.stats.fatigue).toBe(fatigue + 1)
    // Day 3: the end of the way.
    s = stepTrip(opts, s, { type: 'travel' }).state
    expect(s.travel.location).toBe('5')
  })

  it('the pack never comes by day; at night it comes now and then, and stops the trip', () => {
    let packs = 0
    for (const seed of 'abcdefghijkl') {
      const opts = options(seed)
      let s = stepTrip(opts, setOut(opts), { type: 'travel' }).state
      s = stepTrip(opts, s, { type: 'wait', until: nextDawn(s) }).state
      const results = (event: string) =>
        of(s, 'ROLLED', event).map((e) => (e.data?.rolls as { entry: string }[])[0].entry)
      expect(results('WOLVES')).not.toContain('pack')
      if (results('WOLVES_AT_NIGHT').includes('pack')) {
        packs++
        expect(s.travel.pendingChecks).toHaveLength(1)
        expect(of(s, 'CHECK_PAUSED', 'WOLVES_AT_NIGHT')).toHaveLength(1)
      } else expect(s.travel.pendingChecks).toHaveLength(0)
    }
    expect(packs).toBeGreaterThan(0)
  })
})

describe('Systems → Sheet: the company of three plays as the page says', () => {
  const blocks = [...read('en/systems/07-sheet.md').matchAll(/```yaml\n([\s\S]*?)```/g)].map(
    (m) => m[1],
  )
  const sheets = blocks.find((y) => y.includes('kind: sheet'))!
  const [named, added, bound] = parseAllDocuments(blocks.find((y) => y.includes('SCREE'))!).map(
    (d) => d.toJS(),
  )
  const rules = { ...parse(coreFile('travel.yaml')), checks: added.checks }
  const { registry, diagnostics } = loadPacks([
    { path: 'co/pack.yaml', content: 'id: co\nversion: 0.1.0\nformat: 6\nlocale: en\n' },
    {
      path: 'co/travel.yaml',
      // A new system's bindings start with `on: {}`.
      content: `${stringify(rules)}---\n${stringify({ kind: 'bindings', id: 'default', on: {}, ...bound })}`,
    },
    { path: 'co/sheet.yaml', content: sheets },
    { path: 'co/calendar.yaml', content: coreFile('calendar.yaml') },
    {
      path: 'co/system.yaml',
      content: stringify({
        kind: 'system',
        id: 'default',
        name: 'The Company',
        travel: 'travel-rules.default',
        bindings: 'bindings.default',
        calendar: 'calendar.default',
        ...named,
      }),
    },
  ])
  const system = travelSystems(registry).systems.find((s) => s.pack === 'co')!
  const party = partyOf(system)
  const calendar = calendarOf(system)
  // Step 8's way: plains, three hexes of hills, plains.
  const terrains = ['plains', 'hills', 'hills', 'hills', 'plains', 'plains']
  const world: TravelWorld = {
    hexKm: 10,
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
  const nextDawn = (s: SessionState) =>
    calendar.at(s.travel.day + 1, tripStart(system.rules, calendar))
  /** Step 8's company: Kael leads and carries the only ration. */
  function setOut(opts: ReturnType<typeof options>) {
    const members = [
      newMember(party, { id: 'kael', name: 'Kael', values: { survival: 3, rations: 1 } }),
      newMember(party, { id: 'mara', name: 'Mara', values: { rations: 0 } }),
      newMember(party, {
        id: 'tobin',
        name: 'Tobin',
        values: { toughness: 4, health: 4, rations: 0 },
      }),
    ]
    let s = startTrip({ system, location: '0', season: 'summer', members }).session
    s = { ...s, acting: 'kael' }
    return stepTrip(opts, s, { type: 'setDestination', hex: '5' }).state
  }
  const of = (s: SessionState, code: string, check?: string) =>
    s.journal.filter(
      (e) => e.code === code && (!check || e.data?.event === check || e.data?.check === check),
    )
  const health = (s: SessionState) => s.members!.map((m) => m.values.health)

  it('loads (steps 1–7)', () => {
    expect(diagnostics.map(formatDiagnostic)).toEqual([])
    // Explore rolls Core's prompt, which this test doesn't bring.
    expect(
      travelSystems(registry)
        .problems.map(formatDiagnostic)
        .filter((p) => !p.includes('generator.prompt')),
    ).toEqual([])
    expect(system.sheet?.id).toBe('co/sheet')
    expect(system.partySheet?.id).toBe('co/party')
  })

  it('makes the party of its members: Survival, Food, Morale, and the bounds (step 8)', () => {
    const s = setOut(options('co'))
    expect(s.stats).toMatchObject({ survival: 3, morale: 3 })
    expect(s.travel.resources.food).toBe(1)
    expect(s.party?.values.morale).toBe(3)
    // Kael wounded: the best of the others.
    const wounded = structuredClone(s)
    wounded.members![0].conditions.wounded = {}
    refreshParty(wounded, party)
    expect(wounded.stats.survival).toBe(1)
    // Tobin's Toughness lowered: Health falls with it.
    const tired = structuredClone(s)
    applyMemberEffects(tired, { 'characters.tobin.values.toughness': '=2' }, party)
    expect(tired.members![2].values).toMatchObject({ toughness: 2, health: 2 })
  })

  it('scree lames whoever acts on the hills, and nobody marches until it’s cleared', () => {
    let lamed = 0
    for (const seed of 'abcdefghij') {
      const opts = options(seed)
      let s = setOut(opts)
      for (let day = 0; day < 3 && s.travel.location !== '5'; day++) {
        s = stepTrip(opts, s, { type: 'travel' }).state
        const stop = of(s, 'TRAVEL_STOPPED').at(-1)
        if (stop?.data?.reason === 'value') {
          lamed++
          expect(stop.data).toMatchObject({ value: 'lame', who: 'kael' })
          expect(s.members![0].conditions.lame).toBeDefined()
          expect(of(s, 'CHECK_EFFECTS', 'SCREE').length).toBeGreaterThan(0)
          expect(tripAvailability({ system, world }, s).travel).toMatchObject({ who: 'kael' })
          // Lame cleared by hand: the march goes on.
          s = { ...s, members: s.members!.map((m) => ({ ...m, conditions: {} })) }
          expect(tripAvailability({ system, world }, s).travel).toBeUndefined()
        }
        s = stepTrip(opts, s, { type: 'wait', until: nextDawn(s) }).state
      }
      // Scree comes up only on the hills.
      for (const e of of(s, 'CHECK_EFFECTS', 'SCREE')) {
        const entered = of(s, 'HEX_ENTERED').find((h) => h.time === e.time)!
        expect(terrains[Number(entered.data?.hex)]).toBe('hills')
      }
    }
    expect(lamed).toBeGreaterThan(0)
  })

  it('the first night eats the last ration; the second, hunger hurts everyone and morale', () => {
    const opts = options('co')
    let s = setOut(opts)
    s = stepTrip(opts, s, { type: 'wait', until: nextDawn(s) }).state
    expect(s.travel.resources.food).toBe(0)
    expect(s.members![0].values.rations).toBe(0)
    expect(of(s, 'CHECK_EFFECTS', 'HUNGER')).toHaveLength(0)
    const before = health(s)
    s = stepTrip(opts, s, { type: 'wait', until: nextDawn(s) }).state
    expect(of(s, 'CHECK_EFFECTS', 'HUNGER')).toHaveLength(1)
    expect(health(s)).toEqual(before.map((h) => h - 1))
    expect(s.party?.values.morale).toBe(2)
    expect(s.stats.morale).toBe(2)
  })
})
