import {
  bringFactions,
  createCampaign,
  playTrip,
  startWorld,
  takeMoments,
  tripStepped,
  worldAct,
  worldFactsOf,
  worldTurnNow,
  type WorldHost,
  type WorldPlace,
} from '@open-tabletop/campaign'
import { createMap, type HexMap } from '@open-tabletop/map'
import {
  createOracleEngine,
  emptyState,
  formatDiagnostic,
  loadPacks,
} from '@open-tabletop/oracle-engine'
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
import {
  applyCharacter,
  characterFacts,
  createCharacter,
  itemFromCatalogue,
  lookupItems,
  parseCatalogue,
  parseSheet,
  type CharacterAction,
  type CharacterState,
} from '@open-tabletop/character-engine'
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
    { path: 'ex/pack.yaml', content: 'id: ex\nversion: 0.1.0\nformat: 10\nlocale: en\n' },
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
        'world',
        'items',
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
    for (const doc of parseAllDocuments(yaml).map((d) => d.toJS()))
      if (doc?.kind === 'factions') expect(parseFactions(doc).errors).toEqual([])
      else if (doc?.kind === 'sheet') expect(parseSheet(doc).errors).toEqual([])
      else if (doc?.kind === 'items') expect(parseCatalogue(doc).errors).toEqual([])
  })
})

describe('Systems → Your first system: the step-by-step system plays as the manual says', () => {
  const yaml = examples(read('en/systems/03-your-first-system.md')).find((y) =>
    y.includes('dark-lost'),
  )!
  const { registry } = loadPacks([
    { path: 'dark/pack.yaml', content: 'id: dark\nversion: 0.1.0\nformat: 10\nlocale: en\n' },
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
    return {
      ...session,
      party: { ...session.party!, values: { ...session.party!.values, food: 5, torches } },
    }
  }
  const nextDawn = (s: SessionState) =>
    calendarOf(system).at(s.travel.day + 1, tripStart(system.rules, calendarOf(system)))

  it('burns a torch a day; without torches the day tires the party (steps 2, 3, 6)', () => {
    let s = start(1)
    expect(s.stats.fatigue).toBe(0)
    s = stepTrip(options('torch'), s, { type: 'wait', until: nextDawn(s) }).state
    expect(s.party!.values).toMatchObject({ food: 4, torches: 0 })
    expect(s.stats.fatigue).toBe(0)
    s = stepTrip(options('torch'), s, { type: 'wait', until: nextDawn(s) }).state
    expect(s.party!.values.torches).toBe(0)
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
    { path: 'river/pack.yaml', content: 'id: river\nversion: 0.1.0\nformat: 10\nlocale: en\n' },
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
    return {
      ...session,
      travel: { ...session.travel, time },
      party: { ...session.party!, values: { ...session.party!.values, food: 5 } },
    }
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

describe('Systems → Clocks: the spreading fever plays as the page says', () => {
  const blocks = [...read('en/systems/10-clocks.md').matchAll(/```yaml\n([\s\S]*?)```/g)].map(
    (m) => m[1],
  )
  const clocks = blocks.find((y) => y.includes('kind: clocks'))!
  const reactions = blocks.find((y) => y.includes('kind: world'))!
  const [named, added] = parseAllDocuments(blocks.find((y) => y.includes('FEVER'))!).map((d) =>
    d.toJS(),
  )
  const generic = parseAllDocuments(coreFile('travel.yaml'))[0].toJS()
  const rules = {
    ...generic,
    checks: added.checks,
    actions: { ...generic.actions, ...added.actions },
  }
  const { registry, diagnostics } = loadPacks([
    { path: 'core/pack.yaml', content: coreFile('pack.yaml') },
    { path: 'core/scenes.yaml', content: coreFile('scenes.yaml') },
    { path: 'core/roll-modes.yaml', content: coreFile('roll-modes.yaml') },
    {
      path: 'fever/pack.yaml',
      content: "id: fever\nversion: 0.1.0\nformat: 10\nlocale: en\ndependencies: { core: '*' }\n",
    },
    { path: 'fever/travel.yaml', content: stringify(rules) },
    { path: 'fever/clocks.yaml', content: clocks },
    { path: 'fever/world.yaml', content: reactions },
    { path: 'fever/calendar.yaml', content: coreFile('calendar.yaml') },
    {
      path: 'fever/system.yaml',
      content: stringify({
        kind: 'system',
        id: 'default',
        name: 'The Fever Marshes',
        travel: 'travel-rules.default',
        calendar: 'calendar.default',
        ...named,
      }),
    },
  ])
  const system = travelSystems(registry).systems.find((s) => s.pack === 'fever')!
  const calendar = calendarOf(system)
  const host = (seed: string): WorldHost => ({
    calendar,
    clocks: system.clocks,
    world: system.world,
    fallback: 'en',
    oracle: createOracleEngine({ registry, random: seeded(seed) }),
    random: seeded(`${seed}-world`),
    locale: 'en',
    words: {
      clockFull: (full) => full.lines.map((l) => ('say' in l ? l.say : l.text)).join(' '),
      reaction: () => '',
      reactionsStopped: () => '',
      factionLine: (_, line) => line.text ?? '',
    },
  })
  /** Step 8's row: plains, three swamps, then three plains with a road along them. */
  const terrain = ['plains', 'swamp', 'swamp', 'swamp', 'plains', 'plains', 'plains']
  const world: TravelWorld = {
    hexKm: 10,
    cell: (hex) => {
      const [col, row] = hex.split(',').map(Number)
      return row === 0 && terrain[col] ? { terrain: terrain[col] } : null
    },
    neighbors: (hex) => {
      const col = Number(hex.split(',')[0])
      return [col - 1, col + 1].filter((c) => c >= 0 && c < 7).map((c) => `${c},0`)
    },
    distance: (a, b) => Math.abs(Number(a.split(',')[0]) - Number(b.split(',')[0])),
    edges: (a, b) => (Math.min(Number(a[0]), Number(b[0])) >= 4 ? ['road'] : []),
  }
  const clock = (place: WorldPlace, ref: string) =>
    place.campaign.world!.clocks.find((c) => c.ref === ref)!
  const timeline = (place: WorldPlace) => place.campaign.world!.timeline.map((e) => e.text)

  /** Steps 9 and 10, played as the Hexmapper does: the world clock and the trip share one time. */
  function play(seed: string) {
    let s = startTrip({ system, location: '0,0', season: 'summer' }).session
    const h = host(seed)
    const trip = { app: 'hexmapper', id: 'm1', name: 'Trip' }
    const started = startWorld({ campaign: createCampaign('c') }, s.travel.time, h)
    let place: WorldPlace = { ...started, campaign: playTrip(started.campaign, trip) }
    const opts = { system, world, oracle: h.oracle, locale: 'en', random: seeded(seed) }
    const heard: string[] = []
    /** A step of the trip with the world's facts, what it did to the world, and what it hears. */
    const step = (action: Parameters<typeof stepTrip>[2], depth = 0) => {
      const seen = s.journal.length
      s = stepTrip({ ...opts, facts: worldFactsOf(place, h) }, s, action).state
      place = tripStepped(
        place,
        {
          oracle: place.campaign.oracle?.state ?? emptyState(),
          entries: s.journal.slice(seen),
          time: s.travel.time,
        },
        h,
      )
      hear(depth)
    }
    const hear = (depth = 0) => {
      const taken = takeMoments(place.campaign, system.rules)
      place = { ...place, campaign: taken.campaign }
      for (const { at, clock } of taken.heard) {
        if (clock) heard.push(clock)
        if (depth < 10) step({ type: 'moment', at }, depth + 1)
      }
    }
    const travelTo = (hex: string) => {
      step({ type: 'setDestination', hex })
      for (
        let day = 0;
        day < 8 && s.travel.location !== hex && !s.travel.pendingChecks.length;
        day++
      ) {
        step({ type: 'travel' })
        if (s.travel.location !== hex && !s.travel.pendingChecks.length)
          step({ type: 'wait', until: calendar.at(s.travel.day + 1, tripStart(rules, calendar)) })
      }
    }
    return {
      get s() {
        return s
      },
      get place() {
        return place
      },
      heard,
      travelTo,
      /** Step 10: a click on the fever's fourth segment, in the World panel. */
      fillByHand() {
        const fever = clock(place, 'the-fever')
        place = worldAct(place, { type: 'tick', id: fever.id, segments: 4 - fever.filled }, h)
        hear()
      },
    }
  }
  const says = (s: SessionState, text: string) =>
    s.journal.filter((e) => JSON.stringify(e).includes(text)).length

  it('loads (steps 1–7)', () => {
    expect(diagnostics.map(formatDiagnostic)).toEqual([])
    expect(travelSystems(registry).problems.filter((p) => p.file === 'fever/world.yaml')).toEqual(
      [],
    )
    expect(Object.keys(system.clocks!.def.clocks)).toEqual(['the-fever', 'the-closed-roads'])
    expect(Object.keys(system.world!.def.reactions)).toEqual([
      'the-fever-fills',
      'the-closed-roads-fills',
    ])
  })

  it('starts the world with the fever at 1/4 and the roads at 0/2 (step 9)', () => {
    const { place } = play('start')
    expect(clock(place, 'the-fever')).toMatchObject({ name: 'The marsh fever', filled: 1 })
    expect(clock(place, 'the-closed-roads')).toMatchObject({ segments: 2, filled: 0 })
  })

  it('the third swamp fills the fever: the timeline, the roads, and word of it (step 9)', () => {
    const game = play('swamps')
    game.travelTo('4,0')
    expect(game.s.travel.location).toBe('4,0')
    expect(
      timeline(game.place).some((t) =>
        t?.startsWith('The marsh fever: The fever reaches the villages.'),
      ),
    ).toBe(true)
    expect(clock(game.place, 'the-fever').filled).toBe(0)
    expect(clock(game.place, 'the-closed-roads').filled).toBe(1)
    expect(game.heard).toEqual(['The marsh fever'])
    expect(says(game.s, 'Word comes: the fever has reached the villages.')).toBe(1)
    expect(game.s.travel.pendingChecks).toEqual([])
  })

  it('filled by hand, the roads close, the trip hears it, and the road turns it back (step 10)', () => {
    const game = play('by-hand')
    game.travelTo('4,0')
    game.fillByHand()
    expect(timeline(game.place)).toContain('The roads close: The lords close the roads.')
    expect(clock(game.place, 'the-closed-roads').filled).toBe(2)
    expect(game.heard).toEqual(['The marsh fever', 'The marsh fever'])
    expect(says(game.s, 'Word comes: the fever has reached the villages.')).toBe(2)
    game.travelTo('6,0')
    expect(game.s.travel.location).toBe('5,0')
    const barrier = game.s.journal.find((e) => e.code === 'CHECK_PENDING')!
    expect(barrier.data).toMatchObject({ event: 'BARRIER', hex: '5,0' })
  })
})
describe('Systems → World: market day in the Fever Marshes plays as the page says', () => {
  const yaml = (page: string, kind: string) =>
    [...read(page).matchAll(/```yaml\n([\s\S]*?)```/g)]
      .map((m) => m[1])
      .find((y) => y.includes(`kind: ${kind}`))!
  const { registry } = loadPacks([
    { path: 'core/pack.yaml', content: coreFile('pack.yaml') },
    { path: 'core/scenes.yaml', content: coreFile('scenes.yaml') },
    { path: 'core/roll-modes.yaml', content: coreFile('roll-modes.yaml') },
    {
      path: 'fever/pack.yaml',
      content: "id: fever\nversion: 0.1.0\nformat: 10\nlocale: en\ndependencies: { core: '*' }\n",
    },
    { path: 'fever/clocks.yaml', content: yaml('en/systems/10-clocks.md', 'clocks') },
    { path: 'fever/world.yaml', content: yaml('en/systems/11-world.md', 'world') },
    { path: 'fever/calendar.yaml', content: coreFile('calendar.yaml') },
    {
      path: 'fever/system.yaml',
      content:
        'kind: system\nname: The Fever Marshes\ncalendar: calendar.default\nclocks: clocks.default\nworld: world.default\n',
    },
  ])
  const { systems, problems } = travelSystems(registry)
  const system = systems.find((x) => x.pack === 'fever')!
  const calendar = calendarOf(system)
  const host: WorldHost = {
    calendar,
    clocks: system.clocks,
    world: system.world,
    fallback: 'en',
    oracle: createOracleEngine({ registry, random: seeded('market') }),
    random: seeded('market-world'),
    locale: 'en',
    words: {
      clockFull: (full) => full.lines.map((l) => ('say' in l ? l.say : l.text)).join(' '),
      reaction: (lines) => lines.map((l) => ('say' in l ? l.say : l.text)).join(' '),
      reactionsStopped: () => 'Stopped',
      factionLine: () => '',
    },
  }
  const clock = (place: WorldPlace, ref: string) =>
    place.campaign.world!.clocks.find((c) => c.ref === ref)!
  const said = (place: WorldPlace, text: string) =>
    place.campaign.world!.timeline.filter((e) => e.text?.includes(text)).length
  const MARKET = 'Market day: travellers bring the fever along.'
  const QUARANTINE = 'The marshes are under quarantine.'

  it('loads (steps 1–3)', () => {
    expect(problems.filter((p) => p.pack === 'fever')).toEqual([])
    expect(Object.keys(system.world!.def.reactions)).toEqual([
      'the-fever-fills',
      'the-closed-roads-fills',
      'quarantine',
      'market',
    ])
  })

  it('market days bring the fever, until the roads close and the quarantine is said once (steps 4, 5)', () => {
    const day = calendar.minutesPerDay
    let place: WorldPlace = startWorld({ campaign: createCampaign('c') }, day, host)
    // Step 4: a market tomorrow, every 7 days.
    place = worldAct(
      place,
      {
        type: 'schedule',
        event: { name: 'Market day', at: 2 * day + 8 * 60, repeat: { days: 7 } },
      },
      host,
    )
    expect(place.campaign.world!.events[0].id).toBe('market-day')
    // Step 5: fifteen days at once; each market day seen as it begins.
    place = worldAct(place, { type: 'advance', minutes: 15 * day }, host)
    expect(said(place, MARKET)).toBe(3)
    // The third filled the fever: it spread, the roads closed by one.
    expect(said(place, 'The marsh fever: The fever reaches the villages.')).toBe(1)
    expect(clock(place, 'the-fever').filled).toBe(0)
    expect(clock(place, 'the-closed-roads').filled).toBe(1)
    // The roads closed by hand: their line, then the quarantine, once.
    const roads = clock(place, 'the-closed-roads')
    place = worldAct(place, { type: 'tick', id: roads.id, segments: 1 }, host)
    expect(said(place, 'The lords close the roads.')).toBe(1)
    expect(said(place, QUARANTINE)).toBe(1)
    // Another week: no market, the fever as it was.
    const fever = clock(place, 'the-fever').filled
    place = worldAct(place, { type: 'advance', minutes: 7 * day }, host)
    expect(said(place, MARKET)).toBe(3)
    expect(clock(place, 'the-fever').filled).toBe(fever)
    // Open again, then closed again: the quarantine is said again.
    place = worldAct(place, { type: 'tick', id: roads.id, segments: -1 }, host)
    place = worldAct(place, { type: 'tick', id: roads.id, segments: 1 }, host)
    expect(said(place, QUARANTINE)).toBe(2)
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
  const model = examples(read('en/systems/13-weather.md')).find((y) => y.includes('Valley skies'))!
  // A new system: a copy of the Generic rules and Core's calendar, with what steps 5 and 6
  // add, and a check an hour after the weather's that reads it (Common mistakes).
  const core = coreFile
  const rules = parseAllDocuments(core('travel.yaml'))[0].toJS()
  // Step 6: the copy slows rain, storm and snow already; a storm now stops the day.
  expect(rules.weather).toEqual({
    rain: { speed: 0.75 },
    storm: { speed: 0.5 },
    snow: { speed: 0.5 },
  })
  rules.weather.storm = { speed: 0 }
  rules.values = { 'deep-snow': { name: 'Deep snow', blocks: ['modes.horse'] } }
  // Step 5: the copy's weather check, as it comes.
  expect(rules.checks.map((c: { event: string }) => c.event)).toEqual(['WEATHER_CHECK_REQUIRED'])
  rules.checks = [...rules.checks, { event: 'WET', at: '07:00', when: { 'trip.weather': 'rain' } }]
  const { registry, diagnostics } = loadPacks([
    { path: 'valley/pack.yaml', content: 'id: valley\nversion: 0.1.0\nformat: 10\nlocale: en\n' },
    { path: 'valley/travel.yaml', content: stringify(rules) },
    { path: 'valley/calendar.yaml', content: core('calendar.yaml') },
    { path: 'valley/weather.yaml', content: model },
    { path: 'valley/sheet.yaml', content: core('sheet.yaml') },
    {
      path: 'valley/system.yaml',
      content: [
        'kind: bindings\nid: default\non:\n  WEATHER_CHECK_REQUIRED: { weather: weather.weather }',
        'kind: system\nid: default\nname: Valley\ntravel: travel-rules.default\nbindings: bindings.default\ncalendar: calendar.default\nweather: [weather.weather]\npartySheet: sheet.party',
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
    s = { ...s, party: { ...s.party!, values: { ...s.party!.values, food: 99 } } }
    s = stepTrip(opts, s, { type: 'setDestination', hex: '199' }).state
    const seen: { weather: string; wet: boolean; travel: unknown; horse: unknown }[] = []
    for (let day = 0; day < days; day++) {
      const at = s.journal.length
      s = stepTrip(opts, s, { type: 'travel' }).state
      // Today's weather was rolled as the morning began (this step, or the wait before it).
      const weather = s.journal.findLast(
        (e) => e.code === 'ORACLE_RESULT' && e.data?.event === 'WEATHER_CHECK_REQUIRED',
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
  const rules = parseAllDocuments(coreFile('travel.yaml'))[0].toJS()
  for (const part of ['modes', 'terrains', 'values', 'actions'])
    rules[part] = { ...rules[part], ...added[part] }
  // The party's sheet, with the water of step 4 (the page's second block).
  const sheet = [...read('en/systems/05-rules.md').matchAll(/```yaml\n([\s\S]*?)```/g)]
    .map((m) => m[1])
    .find((y) => y.startsWith('kind: sheet'))!
  const { registry, diagnostics } = loadPacks([
    { path: 'salt/pack.yaml', content: 'id: salt\nversion: 0.1.0\nformat: 10\nlocale: en\n' },
    { path: 'salt/travel.yaml', content: stringify(rules) },
    { path: 'salt/sheet.yaml', content: sheet },
    { path: 'salt/calendar.yaml', content: coreFile('calendar.yaml') },
    {
      path: 'salt/system.yaml',
      content:
        'kind: system\nid: default\nname: Salt Road\ntravel: travel-rules.default\ncalendar: calendar.default\npartySheet: sheet.party',
    },
  ])
  const water = (s: SessionState) => s.party!.values.water
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

  it('loads, and starts with the water it says (steps 1–5)', () => {
    expect(diagnostics.map(formatDiagnostic)).toEqual([])
    const s = setOut('summer')
    expect(s.party!.values).toMatchObject({ food: 6, water: 3 })
    expect(s.travel.route).toHaveLength(10)
  })

  it('in summer: two hexes a day by camel, faster along the road, until the water runs out (steps 2–8)', () => {
    let day = march(setOut('summer'))
    // Day 1: a drink as the morning begins; 4 h a desert hex, 1 h 20 min along the road.
    expect(day.lines.find((e) => e.code === 'ACTION_TAKEN')?.data?.action).toBe('drink')
    expect(day.entered).toEqual(['2 10:00', '3 11:20'])
    expect(day.stopped).toMatchObject({ reason: 'conditions', action: 'march' })
    expect(clock(day.s)).toBe('14:00')
    expect(water(day.s)).toBe(2)
    let s = stepTrip(options, day.s, { type: 'wait', until: nextDawn(day.s) }).state
    // Day 2: the rest of hex 4, hex 5, and the salt flat at its own speed (2 h).
    day = march(s)
    expect(day.entered).toEqual(['4 07:20', '5 11:20', '6 13:20'])
    expect(water(day.s)).toBe(1)
    s = stepTrip(options, day.s, { type: 'wait', until: nextDawn(day.s) }).state
    day = march(s)
    expect(day.entered).toEqual(['7 09:20', '8 13:20'])
    expect(water(day.s)).toBe(0)
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
    expect(water(s)).toBe(3)
    s = stepTrip(options, s, { type: 'action', id: 'fill' }).state
    expect(water(s)).toBe(3)
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
  const rules = { ...parseAllDocuments(coreFile('travel.yaml'))[0].toJS(), checks: added.checks }
  const { registry, diagnostics } = loadPacks([
    { path: 'wolf/pack.yaml', content: 'id: wolf\nversion: 0.1.0\nformat: 10\nlocale: en\n' },
    {
      path: 'wolf/travel.yaml',
      content: `${stringify(rules)}---\n${stringify({ kind: 'bindings', id: 'default', ...bound })}`,
    },
    { path: 'wolf/tables.yaml', content: table },
    { path: 'wolf/calendar.yaml', content: coreFile('calendar.yaml') },
    { path: 'wolf/sheet.yaml', content: coreFile('sheet.yaml') },
    {
      path: 'wolf/system.yaml',
      content:
        'kind: system\nid: default\nname: Wolf Country\ntravel: travel-rules.default\nbindings: bindings.default\ncalendar: calendar.default\npartySheet: sheet.party',
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
    s = { ...s, party: { ...s.party!, values: { ...s.party!.values, food: 1 } } }
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
    expect(s.party!.values.food).toBe(0)
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
    expect(of(s, 'LIMIT_REACHED').at(-1)?.data).toMatchObject({ path: 'party.values.food' })
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
  const rules = { ...parseAllDocuments(coreFile('travel.yaml'))[0].toJS(), checks: added.checks }
  const { registry, diagnostics } = loadPacks([
    { path: 'co/pack.yaml', content: 'id: co\nversion: 0.1.0\nformat: 10\nlocale: en\n' },
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
      newMember(party, { id: 'kael', name: 'Kael', values: { survival: 3 } }),
      newMember(party, { id: 'mara', name: 'Mara' }),
      newMember(party, { id: 'tobin', name: 'Tobin', values: { toughness: 4, health: 4 } }),
    ]
    let s = startTrip({ system, location: '0', season: 'summer', members }).session
    // The Company's Food set to 1 on its card.
    s = { ...s, acting: 'kael', party: { ...s.party!, values: { ...s.party!.values, food: 1 } } }
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
    expect(s.party?.values).toMatchObject({ morale: 3, food: 1 })
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

  it('the first night eats the last food; the second, hunger hurts everyone and morale', () => {
    const opts = options('co')
    let s = setOut(opts)
    s = stepTrip(opts, s, { type: 'wait', until: nextDawn(s) }).state
    expect(s.party!.values.food).toBe(0)
    expect(of(s, 'CHECK_EFFECTS', 'HUNGER')).toHaveLength(0)
    const before = health(s)
    s = stepTrip(opts, s, { type: 'wait', until: nextDawn(s) }).state
    expect(of(s, 'CHECK_EFFECTS', 'HUNGER')).toHaveLength(1)
    expect(health(s)).toEqual(before.map((h) => h - 1))
    expect(s.party?.values.morale).toBe(2)
    expect(s.stats.morale).toBe(2)
  })
})

describe('Systems → Factions: the border feud plays as the page says', () => {
  const blocks = [...read('en/systems/09-factions.md').matchAll(/```yaml\n([\s\S]*?)```/g)].map(
    (m) => m[1],
  )
  const factions = blocks.find((y) => y.includes('kind: factions'))!
  const table = blocks.find((y) => y.includes('id: reaver-raid'))!
  const [named, added] = parseAllDocuments(blocks.find((y) => y.includes('REAVERS'))!).map((d) =>
    d.toJS(),
  )
  const rules = { ...parseAllDocuments(coreFile('travel.yaml'))[0].toJS(), checks: added.checks }
  const { registry, diagnostics } = loadPacks([
    { path: 'core/pack.yaml', content: coreFile('pack.yaml') },
    { path: 'core/factions.yaml', content: coreFile('factions.yaml') },
    {
      path: 'border/pack.yaml',
      content: "id: border\nversion: 0.1.0\nformat: 10\nlocale: en\ndependencies: { core: '*' }\n",
    },
    { path: 'border/travel.yaml', content: stringify(rules) },
    { path: 'border/factions.yaml', content: factions },
    { path: 'border/tables.yaml', content: table },
    { path: 'border/calendar.yaml', content: coreFile('calendar.yaml') },
    {
      path: 'border/system.yaml',
      content: stringify({
        kind: 'system',
        id: 'default',
        name: 'The Border',
        travel: 'travel-rules.default',
        calendar: 'calendar.default',
        ...named,
      }),
    },
  ])
  const system = travelSystems(registry).systems.find((s) => s.pack === 'border')!
  const calendar = calendarOf(system)
  const host = (seed: string): WorldHost => ({
    calendar,
    clocks: system.clocks,
    fallback: 'en',
    factions: system.factions,
    oracle: createOracleEngine({ registry, random: seeded(seed) }),
    random: seeded(`${seed}-world`),
    locale: 'en',
    words: {
      clockFull: () => '',
      reaction: () => '',
      reactionsStopped: () => '',
      factionLine: (_, line) => `${line.faction}: ${line.text}`,
    },
  })
  /** Step 7's map: the Low Fells on the west (columns 0–1), the High Moor on the east (4–5). */
  function borderMap(): HexMap {
    const map = createMap('The Border')
    map.grid = { ...map.grid, width: 10, height: 6 }
    map.regions = [
      { id: 'fells', name: 'The Low Fells', color: '#88aa77' },
      { id: 'moor', name: 'The High Moor', color: '#aa8866' },
    ]
    for (let col = 0; col < 10; col++)
      for (let row = 0; row < 6; row++)
        map.hexes[`${col},${row}`] = {
          terrain: 'plains',
          ...(col < 2 && { region: 'fells' }),
          ...(col >= 4 && col < 6 && { region: 'moor' }),
        }
    return map
  }
  /** Step 8: the world clock started on day 1 at 06:00, and the factions brought in. */
  function broughtIn(seed: string, time = 1440 + 360): WorldPlace {
    const map = borderMap()
    const start = startWorld({ campaign: createCampaign('c'), map }, time, host(seed))
    const { territories, ...own } = bringFactions(
      start.campaign,
      map,
      system.factions!,
      'border',
      time,
    )
    return { campaign: { ...start.campaign, factions: own }, map: { ...map, territories } }
  }
  const land = (place: WorldPlace, id: string) => place.map!.territories?.[id] ?? []
  const sheet = (place: WorldPlace, id: string) =>
    place.campaign.factions!.factions.find((f) => f.id === id)!

  it('loads (steps 1–6)', () => {
    expect(diagnostics.map(formatDiagnostic)).toEqual([])
    expect(system.factions?.def.factions['the-reavers'].turn).toBe('table.reaver-raid')
  })

  it('brings them in on their regions, with their starting Strength (step 8)', () => {
    const place = broughtIn('a')
    expect(land(place, 'the-wardens')).toHaveLength(12)
    expect(land(place, 'the-reavers')).toHaveLength(12)
    expect(sheet(place, 'the-wardens').values.strength).toBe(4)
    expect(sheet(place, 'the-reavers').values.strength).toBe(3)
  })

  it('world turns: the Wardens first on Core’s table, then the Reavers on theirs', () => {
    const texts = new Set<string>()
    let burned = 0
    let beaten = 0
    for (let seed = 0; seed < 40; seed++) {
      let place = broughtIn(`turns-${seed}`)
      for (let turn = 0; turn < 6; turn++) {
        const before = { place, reavers: sheet(place, 'the-reavers').values.strength }
        const done = worldTurnNow(place, host(`turns-${seed}-${turn}`))
        place = done
        expect(done.lines.map((l) => l.faction)).toEqual(['the-wardens', 'the-reavers'])
        for (const l of done.lines) texts.add(`${l.faction}: ${l.text}`)
        const raid = done.lines[1]
        if (raid.text === 'A steading burns') {
          burned++
          expect(before.reavers).toBeGreaterThanOrEqual(2)
          expect(land(place, 'the-reavers').length).toBe(
            land(before.place, 'the-reavers').length + 1,
          )
          expect(sheet(place, 'the-wardens').conditions).toHaveProperty('at-war')
          // Nobody's land first: a Warden hex is taken only when none is left beside them.
          const taken = raid.territory![0]
          if (taken.type === 'TERRITORY_GAINED' && taken.from)
            expect(taken.from).toBe('the-wardens')
        }
        if (raid.text === 'The raid is beaten off') {
          beaten++
          expect(sheet(place, 'the-reavers').values.strength).toBe(Math.max(0, before.reavers - 1))
        }
        // Strength keeps within the sheet's bounds.
        for (const f of place.campaign.factions!.factions)
          expect(f.values.strength).toBeGreaterThanOrEqual(0)
      }
    }
    expect(burned).toBeGreaterThan(0)
    expect(beaten).toBeGreaterThan(0)
    for (const text of [
      'the-wardens: Expands its reach',
      'the-wardens: Holds what it has',
      'the-reavers: Cattle driven off in the night',
      'the-reavers: A steading burns',
    ])
      expect(texts).toContain(text)
  })

  it('at Strength 1 the Reavers never burn a steading', () => {
    for (let seed = 0; seed < 20; seed++) {
      const place = broughtIn(`weak-${seed}`)
      const reavers = sheet(place, 'the-reavers')
      reavers.values.strength = 1
      const done = worldTurnNow(place, host(`weak-${seed}`))
      expect(done.lines[1].text).not.toBe('A steading burns')
    }
  })

  it('a turn comes by itself a week after they came in (step 8’s Next day, eight times)', () => {
    let place: WorldPlace = broughtIn('week')
    const turns: number[] = []
    for (let day = 1; day <= 8; day++) {
      const next = calendar.at(calendar.describe(place.campaign.world!.time).day + 1, '00:00')
      place = worldAct(place, { type: 'setTime', time: next }, host(`week-${day}`))
      const lines = place.campaign.world!.timeline.filter((e) =>
        e.text?.startsWith('the-wardens: '),
      )
      turns.push(lines.length)
    }
    expect(turns).toEqual([0, 0, 0, 0, 0, 0, 0, 1])
  })

  it('robbers on the Reavers’ land only, as often as they are strong, and bolder for it', () => {
    let robbed = 0
    for (let seed = 0; seed < 10; seed++) {
      let s = startTrip({ system, location: '0,2', season: 'summer' }).session
      // The world clock and the trip share one time.
      let place = broughtIn(`trip-${seed}`, s.travel.time)
      // Step 9: along row 2, from the fells across the moor to the east.
      const world: TravelWorld = {
        hexKm: 10,
        cell: (hex) => {
          const holder = Object.entries(place.map!.territories ?? {}).find(([, h]) =>
            h.includes(hex),
          )?.[0]
          return /^\d,2$/.test(hex)
            ? { terrain: 'plains', ...(holder && { faction: holder }) }
            : null
        },
        neighbors: (hex) => {
          const col = Number(hex.split(',')[0])
          return [col - 1, col + 1].filter((c) => c >= 0 && c < 10).map((c) => `${c},2`)
        },
        distance: (a, b) => Math.abs(Number(a.split(',')[0]) - Number(b.split(',')[0])),
        edges: () => [],
      }
      const h = host(`trip-${seed}`)
      const opts = {
        system,
        world,
        oracle: h.oracle,
        locale: 'en',
        random: seeded(`trip-${seed}`),
      }
      /** A step of the trip with the world's facts, and what it did to the world. */
      const step = (action: Parameters<typeof stepTrip>[2]) => {
        const seen = s.journal.length
        const strength = sheet(place, 'the-reavers').values.strength
        s = stepTrip({ ...opts, facts: worldFactsOf(place, h) }, s, action).state
        const fresh = s.journal.slice(seen)
        place = tripStepped(
          place,
          {
            oracle: place.campaign.oracle?.state ?? emptyState(),
            entries: fresh,
            time: s.travel.time,
          },
          h,
        )
        const robberies = fresh.filter(
          (e) => e.code === 'CHECK_EFFECTS' && e.data?.event === 'REAVERS',
        )
        for (const e of robberies) {
          // Only on their land.
          const entered = fresh.find((x) => x.code === 'HEX_ENTERED' && x.time === e.time)!
          expect(land(place, 'the-reavers')).toContain(entered.data?.hex)
        }
        // Each robbery makes the Reavers one stronger, up to their Max.
        expect(sheet(place, 'the-reavers').values.strength).toBe(
          Math.min(6, strength + robberies.length),
        )
        robbed += robberies.length
      }
      step({ type: 'setDestination', hex: '9,2' })
      for (let day = 0; day < 4 && s.travel.location !== '9,2'; day++) {
        step({ type: 'travel' })
        step({
          type: 'wait',
          until: calendar.at(s.travel.day + 1, tripStart(system.rules, calendar)),
        })
      }
      expect(s.travel.location).toBe('9,2')
    }
    expect(robbed).toBeGreaterThan(0)
  })
})

describe("Systems → Items: a delver's kit plays as the manual says", () => {
  const yaml = examples(read('en/systems/08-items.md')).find((y) => y.includes('kind: items'))!
  const docs = parseAllDocuments(yaml).map((d) => d.toJS())
  const sheet = parseSheet(docs.find((d) => d.kind === 'sheet')).sheet!
  const gear = parseCatalogue(docs.find((d) => d.kind === 'items')).catalogue!
  const items = lookupItems([{ id: 'kit/gear', def: gear }])
  const act = (c: CharacterState, action: CharacterAction) =>
    applyCharacter(sheet, c, action, { items })
  const pick = (id: string) =>
    ({
      type: 'addItem',
      item: itemFromCatalogue(sheet.items, 'kit/gear', id, gear.items[id]),
    }) as const

  it('fills the hands, piles mail on the body, is encumbered until it drops some, burns the torch out', () => {
    let kael = createCharacter(sheet, 'kit/delver', { id: 'kael', name: 'Kael' })
    for (const id of ['rope', 'torch', 'mail', 'mail', 'mail']) kael = act(kael, pick(id)).state
    expect(kael.items!.map((i) => [i.id, i.place, i.count])).toEqual([
      ['rope', 'hands', 1],
      ['torch', 'hands', 1],
      ['mail', 'body', 3],
    ])
    const places = characterFacts(kael, sheet).places as Record<string, { used: number }>
    expect([places.hands.used, places.body.used]).toEqual([2, 6])
    expect(kael.values).toMatchObject({ load: 8, capacity: 6 })
    expect(kael.conditions).toHaveProperty('encumbered')
    // The mail shirts' How many set to 1: the load falls and Encumbered lifts.
    kael = act(kael, { type: 'editItem', key: 'mail', count: '=1' }).state
    expect(kael.values.load).toBe(4)
    expect(kael.conditions).not.toHaveProperty('encumbered')
    // Light, three times: the third uses the torch up.
    let events: string[] = []
    for (let i = 0; i < 3; i++) {
      const done = act(kael, { type: 'change', effects: { 'items.torch.uses': -1 } })
      kael = done.state
      events = done.events.map((e) => e.type)
    }
    expect(events).toContain('ITEM_SPENT')
    expect(kael.items!.some((i) => i.id === 'torch')).toBe(false)
  })
})
