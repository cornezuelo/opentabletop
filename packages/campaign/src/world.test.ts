import { createMap, type HexMap } from '@open-tabletop/map'
import { createOracleEngine, loadPacks } from '@open-tabletop/oracle-engine'
import { seeded } from '@open-tabletop/random'
import { calendarOf, travelSystems, type ReactionLine } from '@open-tabletop/session'
import type { WeatherModel } from '@open-tabletop/weather-engine'
import { parseWorldRules } from '@open-tabletop/world-engine'
import { describe, expect, it } from 'vitest'
import {
  bringFactions,
  createCampaign,
  deserializeCampaign,
  serializeCampaign,
  waitingSaid,
  worldAnswer,
  followTrip,
  missingClocks,
  playTrip,
  startWorld,
  takeMoments,
  tripStepped,
  worldAct,
  worldEffects,
  worldFactsOf,
  worldTurnNow,
  type Campaign,
  type WorldHost,
} from './index'

/**
 * A system with a clock that fills on the factions' turns and does something when full, a
 * turn every two days, and a weather model of one kind of sky.
 */
const PACK = [
  { path: 'marks/pack.yaml', content: 'id: marks\nversion: 0.1.0\nlocale: en\nformat: 12\n' },
  {
    path: 'marks/system.yaml',
    content:
      'kind: system\nname: Marks\nfactions: factions.default\nclocks: clocks.default\nworld: world.default\n',
  },
  {
    path: 'marks/world.yaml',
    content: `
kind: sheet
id: faction
values:
  strength: { default: 2, min: 0, max: 6 }
conditions:
  at-war: {}
---
kind: factions
id: default
sheet: sheet.faction
turn: table.turn
every: 2
factions:
  clans:
    territory: { regions: [Hills] }
---
kind: table
id: turn
roll: 1d1
entries:
  - range: 1
    result: Pushes on
    effects: { faction.territory: 1, world.clocks.march: 1 }
---
kind: clocks
id: default
clocks:
  march:
    segments: 2
    then: reset
---
kind: world
id: default
reactions:
  river:
    on: world.clocks.march.full
    do:
      - say: The clans reach the river.
      - effects: { factions.clans.values.strength: 3 }
  # Once the clans are at war: a line, once, until they stop being.
  war:
    on: { when: { factions.clans.conditions: at-war } }
    do:
      - say: 'War! (strength {{factions.clans.values.strength}})'
  # A fair's day, seen as the day begins, even in the middle of a long jump.
  fair:
    on: { when: { world.events: fair } }
    do:
      - say: The fair is on.
      - do: world.reactions.rumour
  rumour:
    on: world.turn
    unless: { factions.clans.values.strength: { gte: 6 } }
    do:
      - roll: table.rumour
---
kind: table
id: rumour
roll: 1d1
entries:
  - { range: 1, result: Smoke in the hills, effects: { world.clocks.march: 0 } }
---
kind: weather
id: sky
states: { grey: { name: Grey } }
seasons: { spring: { start: grey, next: { grey: { grey: 1 } } } }
`,
  },
]

const { registry } = loadPacks(PACK)
const marks = travelSystems(registry).systems.find((s) => s.id === 'marks')!
const sky = registry.extras.get('marks')!.find((e) => e.kind === 'weather')!
  .data as unknown as WeatherModel

function host(over: Partial<WorldHost> = {}): WorldHost {
  return {
    calendar: calendarOf(marks),
    clocks: marks.clocks,
    world: marks.world,
    fallback: 'en',
    weather: sky,
    factions: marks.factions,
    oracle: createOracleEngine({ registry, random: seeded(1) }),
    random: seeded(2),
    locale: 'en',
    words: {
      clockFull: (full) => [reaction(full.lines), full.then].filter(Boolean).join(' '),
      reaction,
      reactionsStopped: () => 'Stopped.',
      factionLine: (_, line) => `${line.faction}: ${line.text}`,
      answered: (question, choice) => `${question} ${choice}`,
    },
    ...over,
  }
}

const reaction = (lines: ReactionLine[]) =>
  lines.map((l) => ('say' in l ? l.say : (l.error ?? l.text))).join(' ')

function hillsMap(): HexMap {
  const map = createMap('North')
  map.grid = { ...map.grid, width: 6, height: 6 }
  map.regions = [{ id: 'r1', name: 'Hills', color: '#888888' }]
  map.hexes['2,2'] = { region: 'r1' }
  return map
}

/** A campaign with its clock started on day 1 and the clans brought onto a map. */
function started(): { campaign: Campaign; map: HexMap } {
  const map = hillsMap()
  const start = startWorld({ campaign: createCampaign('c1'), map }, 1440 + 360, host())
  const factions = bringFactions(start.campaign, map, marks.factions!, 'marks', 1440 + 360)
  const { territories, ...own } = factions
  return { campaign: { ...start.campaign, factions: own }, map: { ...map, territories } }
}

describe('the world of a campaign', () => {
  it('starts with the clocks its system declares and the weather of its first day', () => {
    const { campaign } = started()
    expect(campaign.world?.time).toBe(1440 + 360)
    expect(campaign.world?.clocks.map((c) => c.ref)).toEqual(['march'])
    expect(campaign.worldWeather).toEqual({ weather: 'grey', day: 2 })
    expect(missingClocks(campaign, host())).toEqual([])
    // With a trip going on, the weather is the trip's: none of the world's own.
    const tripping = startWorld({ campaign: createCampaign('c2') }, 0, host({ trip: {} }))
    expect(tripping.campaign.worldWeather).toBeUndefined()
  })

  it('a trip’s highlights go to the timeline at their time, and the world follows the trip', () => {
    const place = started()
    const now = place.campaign.world!.time
    const done = tripStepped(
      place,
      {
        oracle: { decks: {}, occurrences: {}, vars: {} } as never,
        entries: [],
        time: now + 120,
        highlights: [{ time: now + 60, text: 'The party reaches 0303' }],
      },
      host({ trip: {} }),
    )
    const line = done.campaign.world!.timeline.find((e) => e.text === 'The party reaches 0303')
    expect(line).toMatchObject({ code: 'LOG', time: now + 60, data: { trip: true } })
    expect(done.campaign.world!.time).toBe(now + 120)
    // A campaign whose clock hasn't started keeps no timeline.
    const none = tripStepped(
      { campaign: createCampaign('c3') },
      { oracle: {} as never, entries: [], time: 60, highlights: [{ time: 0, text: 'x' }] },
      host({ trip: {} }),
    )
    expect(none.campaign.world).toBeUndefined()
  })

  it('takes the factions’ turns as they come due; a full clock does what it says', () => {
    const place = started()
    // Four days on: two turns (every two days), each a hex more and a segment of the march.
    const done = worldAct(place, { type: 'advance', minutes: 4 * 1440 }, host())
    const lines = done.campaign.world!.timeline.map((e) => e.text)
    expect(lines.filter((l) => l === 'clans: Pushes on')).toHaveLength(2)
    // The second turn filled the march: its words, its effect, and it starts over.
    expect(lines).toContain('march: The clans reach the river. reset')
    expect(done.filled).toEqual([{ clock: 'march', text: 'The clans reach the river. reset' }])
    expect(done.campaign.world!.clocks[0].filled).toBe(0)
    expect(done.campaign.factions!.factions[0].values.strength).toBe(5)
    // Their land grew on the map being played.
    expect(done.map!.territories!.clans).toHaveLength(3)
    // The weather followed, day by day.
    expect(done.campaign.worldWeather?.day).toBe(6)
    expect(done.campaign.factions!.lastTurn).toBe(1440 * 5 + 360)
  })

  it('plays without a map: the sheets and clocks change, no land does', () => {
    const { campaign } = started()
    const done = worldTurnNow({ campaign }, host())
    expect(done.lines).toHaveLength(1)
    expect(done.map).toBeUndefined()
    expect(done.campaign.world!.clocks[0].filled).toBe(1)
    // What tables read: the factions, with no land where no map is played.
    expect(worldFactsOf({ campaign: done.campaign }, host())).toMatchObject({
      factions: { clans: { territory: 0 } },
      weather: 'grey',
    })
  })

  it('takes a trip’s effects and follows its time', () => {
    const place = started()
    const hit = worldEffects(
      place,
      { 'world.clocks.march': '=2', 'factions.clans.territory': -1 },
      host({ trip: { weather: 'rain' } }),
    )
    expect(hit.filled).toHaveLength(1)
    // No trip going on: nobody to hear it.
    expect(hit.campaign.moments).toBeUndefined()
    expect(hit.map!.territories!.clans ?? []).toHaveLength(0)
    // A condition too (`true` holds it).
    const marked = worldEffects(place, { 'factions.clans.conditions.at-war': true }, host())
    expect(marked.campaign.factions!.factions[0].conditions).toHaveProperty('at-war')
    const time = place.campaign.world!.time + 60
    const scheduled = worldAct(hit, { type: 'schedule', event: { name: 'Fair', at: time } }, host())
    const followed = followTrip(scheduled, time + 1, host({ trip: {} }))
    expect(followed.lines).toEqual([{ code: 'WORLD_EVENT', text: 'Fair', time }])
    expect(followed.campaign.world!.time).toBe(time + 1)
  })

  it('keeps every clock that fills for the trip going on, by hand too', () => {
    const place = started()
    const trip = { app: 'travel', id: 't1', name: 'Trip' }
    const playing = { ...place, campaign: playTrip(place.campaign, trip) }
    // The declared clock filled by hand, and a clock made by hand.
    let done = worldAct(
      playing,
      { type: 'tick', id: playing.campaign.world!.clocks[0].id, segments: 4 },
      host(),
    )
    done = worldAct(
      done,
      { type: 'addClock', clock: { name: 'The Wyrm wakes!', segments: 2 } },
      host(),
    )
    const wyrm = done.campaign.world!.clocks.find((c) => c.name === 'The Wyrm wakes!')!
    done = worldAct(done, { type: 'tick', id: wyrm.id, segments: 2 }, host())
    expect(done.campaign.moments).toEqual([
      { clock: 'march', at: ['world.clocks.march.full'] },
      { clock: 'The Wyrm wakes!', at: ['world.clocks.the-wyrm-wakes.full'] },
    ])
    // A trip hears those its rules name, by the clock's declared id or its name as an id.
    const rules = (...on: string[]) =>
      ({
        actions: Object.fromEntries(on.map((o, i) => [`a${i}`, { on: o, do: [{ time: 60 }] }])),
        checks: [],
      }) as never
    const taken = takeMoments(
      done.campaign,
      rules('world.clocks.the-wyrm-wakes.full', 'world.clocks.march.full'),
    )
    expect(taken.heard).toEqual([
      { at: 'world.clocks.march.full', clock: 'march' },
      { at: 'world.clocks.the-wyrm-wakes.full', clock: 'The Wyrm wakes!' },
    ])
    expect(taken.campaign.moments).toBeUndefined()
    // Moments its rules don't name are dropped.
    expect(takeMoments(done.campaign, rules('world.clocks.other.full')).heard).toEqual([])
  })

  it('a trip brings a world turn (`do: world.turn`), its journal told, the trip hearing it', () => {
    const place = started()
    const trip = { app: 'travel', id: 't1', name: 'Trip' }
    const playing = { ...place, campaign: playTrip(place.campaign, trip) }
    const now = playing.campaign.world!.time
    const step = (p: { campaign: Campaign; map?: HexMap }, at = now + 60) =>
      tripStepped(
        p,
        {
          oracle: { decks: {}, occurrences: {}, vars: {} } as never,
          entries: [{ code: 'WORLD_DO', time: at, data: { action: 'news', do: 'world.turn' } }],
          time: now + 120,
        },
        host({ trip: {} }),
      )
    const done = step(playing)
    // The clans' turn, at the step's time, then the world's reaction to it.
    const timeline = done.campaign.world!.timeline
    expect(timeline.find((e) => e.text === 'clans: Pushes on')?.time).toBe(now + 60)
    expect(timeline.at(-1)!.data).toEqual({ reaction: 'rumour' })
    expect(done.map!.territories!.clans).toHaveLength(2)
    // The trip's journal is told what the factions did.
    expect(done.lines).toEqual([{ code: 'WORLD_TURN', text: 'clans: Pushes on', time: now + 60 }])
    // The trip hears it on its next step, if its rules name it.
    expect(done.campaign.moments).toEqual([{ at: ['world.turn'] }])
    const rules = { actions: { rumour: { on: 'world.turn', do: [] } }, checks: [] } as never
    expect(takeMoments(done.campaign, rules).heard).toEqual([{ at: 'world.turn' }])
    // Without factions the world has no turn to play: an empty line, nothing else.
    const none = step({ campaign: { ...playing.campaign, factions: undefined } })
    expect(none.lines).toEqual([{ code: 'WORLD_TURN', text: '', time: now + 60 }])
    expect(none.campaign.moments).toBeUndefined()
  })

  it('tells a trip the world turns that came due on its way', () => {
    const place = started()
    const now = place.campaign.world!.time
    const followed = followTrip(place, now + 3 * 1440, host({ trip: {} }))
    expect(followed.lines.filter((l) => l.code === 'WORLD_TURN')).toEqual([
      { code: 'WORLD_TURN', text: 'clans: Pushes on', time: now + 2 * 1440 },
    ])
  })

  it('reacts by itself: after a world turn, a condition turning true once, an event’s day', () => {
    const place = started()
    // A world turn: the clans' line, then the reaction to it (a table rolled).
    const turned = worldTurnNow(place, host())
    const texts = (d: { campaign: Campaign }) => d.campaign.world!.timeline.map((e) => e.text)
    expect(texts(turned).slice(-3)).toEqual(['clans: Pushes on', 'march', 'Smoke in the hills'])
    expect(turned.campaign.world!.timeline.at(-1)!.data).toEqual({ reaction: 'rumour' })
    // At war: said once, with what the world shows then; not again while it holds.
    const war = worldEffects(turned, { 'factions.clans.conditions.at-war': true }, host())
    expect(texts(war).at(-1)).toBe('War! (strength 2)')
    expect(war.campaign.reactions).toEqual(['war:0'])
    const again = worldEffects(war, { 'factions.clans.values.strength': 1 }, host())
    expect(texts(again).filter((t) => t?.startsWith('War!'))).toHaveLength(1)
    // It stops holding, and comes again when it turns true again.
    const peace = worldEffects(again, { 'factions.clans.conditions.at-war': false }, host())
    expect(peace.campaign.reactions).toEqual([])
    const back = worldEffects(peace, { 'factions.clans.conditions.at-war': true }, host())
    expect(texts(back).filter((t) => t?.startsWith('War!'))).toHaveLength(2)
  })

  it('sees each day of a long jump, and a reaction brings another', () => {
    const place = started()
    const day = 1440
    const at = place.campaign.world!.time + 2 * day
    const scheduled = worldAct(
      place,
      { type: 'schedule', event: { name: 'Fair', at: at - 360 } },
      host(),
    )
    // A week on in one go: the fair's day is seen on the way, its line and the rumour it brings.
    const done = worldAct(scheduled, { type: 'advance', minutes: 7 * day }, host())
    const fair = done.campaign.world!.timeline.find((e) => e.data?.reaction === 'fair')!
    expect(fair.text).toBe('The fair is on. Smoke in the hills')
    expect(fair.time).toBe(Math.floor(at / day) * day)
    // Its day is over: it no longer holds.
    expect(done.campaign.reactions).toEqual([])
  })

  it('takes what holds as seen in a campaign that kept nothing', () => {
    const place = started()
    const opened = worldEffects(
      { ...place, campaign: { ...place.campaign, reactions: undefined } },
      { 'factions.clans.conditions.at-war': true },
      host(),
    )
    // Kept nothing: what holds now is taken as seen, nothing said.
    expect(opened.campaign.reactions).toEqual(['war:0'])
    expect(opened.campaign.world!.timeline.some((e) => e.text?.startsWith('War!'))).toBe(false)
  })

  it('stops reactions that bring each other too deep, with a line', () => {
    const rules = (yaml: string) =>
      travelSystems(
        loadPacks([
          PACK[0],
          { path: 'marks/system.yaml', content: 'kind: system\nworld: world.default\n' },
          { path: 'marks/world.yaml', content: yaml },
        ]).registry,
      )
    // A loop the pack shows is refused when it loads.
    const looped = rules(`
kind: world
id: default
reactions:
  a: { on: world.turn, do: [{ do: world.reactions.b }] }
  b: { on: world.clocks.x.full, do: [{ do: world.turn }] }
`)
    expect(looped.systems.find((s) => s.id === 'marks')?.world).toBeUndefined()
    expect(looped.problems.map((p) => p.message)).toContainEqual(
      expect.stringContaining('reactions bring each other in a loop: a → b → a'),
    )
    // One that numbers make (each filling the other's clock) is stopped while playing.
    const ping = rules(`
kind: world
id: default
reactions:
  ping:
    on: world.clocks.ping.full
    do: [{ effects: { world.clocks.ping: -1, world.clocks.pong: '{{1}}' } }]
  pong:
    on: world.clocks.pong.full
    do: [{ effects: { world.clocks.pong: -1, world.clocks.ping: '{{1}}' } }]
`).systems.find((s) => s.id === 'marks')!
    let place: { campaign: Campaign } = {
      campaign: startWorld({ campaign: createCampaign('c') }, 0, host()).campaign,
    }
    for (const name of ['Ping', 'Pong'])
      place = worldAct(place, { type: 'addClock', clock: { name, segments: 1 } }, host())
    const done = worldAct(
      place,
      {
        type: 'tick',
        id: place.campaign.world!.clocks.find((c) => c.name === 'Ping')!.id,
        segments: 1,
      },
      host({ world: ping.world, clocks: undefined }),
    )
    expect(done.campaign.world!.timeline.filter((e) => e.text === 'Stopped.')).toHaveLength(1)
  })
})

describe('the world waits for the player', () => {
  /** World rules of their own, in the marks pack (its tables, its clocks and factions). */
  const waits = (reactions: Record<string, unknown>) => {
    const parsed = parseWorldRules({ kind: 'world', id: 'waits', reactions })
    expect(parsed.errors).toEqual([])
    return { id: 'marks/waits', pack: 'marks', def: parsed.rules! }
  }
  const texts = (d: { campaign: Campaign }) => d.campaign.world!.timeline.map((e) => e.text)
  const bridge = waits({
    bridge: {
      name: 'The bridge',
      on: 'world.turn',
      params: {
        who: {
          name: 'Who takes the bridge?',
          choices: [
            { id: 'clans', name: 'The Clans' },
            { id: 'vale', name: 'The Vale' },
          ],
        },
      },
      do: [
        { say: 'The bridge stands empty.' },
        { ask: 'params.who' },
        { when: { 'params.who': 'clans' }, effects: { 'factions.clans.values.strength': 1 } },
        { say: 'Taken: {{params.who}}' },
      ],
    },
    after: { on: 'world.turn', do: [{ say: 'After the bridge.' }] },
  })

  it('asks in the middle of a turn: nothing moves until answered, then the rest goes on', () => {
    const h = host({ world: bridge })
    const turned = worldTurnNow(started(), h)
    expect(turned.campaign.waiting).toEqual({
      reaction: 'bridge',
      ask: 'who',
      rest: [
        { kind: 'steps', reaction: 'bridge', next: 2 },
        { kind: 'reactions', ids: ['after'] },
      ],
    })
    expect(texts(turned)).toContain('clans: Pushes on')
    expect(texts(turned).at(-1)).toBe('The bridge stands empty. Who takes the bridge?')
    expect(waitingSaid(turned.campaign, h)).toEqual({
      reaction: 'The bridge',
      question: {
        question: 'Who takes the bridge?',
        choices: [
          { id: 'clans', name: 'The Clans' },
          { id: 'vale', name: 'The Vale' },
        ],
      },
    })
    // Kept when saved.
    expect(deserializeCampaign(serializeCampaign(turned.campaign)).waiting).toEqual(
      turned.campaign.waiting,
    )
    // While it waits, the world doesn't move, and a choice it doesn't offer answers nothing.
    const time = turned.campaign.world!.time
    const moved = worldAct(turned, { type: 'advance', minutes: 1440 }, h)
    expect(moved.campaign.world!.time).toBe(time)
    expect(worldAnswer(turned, h, 'nobody').campaign).toBe(turned.campaign)
    expect(worldAnswer(turned, h).campaign).toBe(turned.campaign)
    // Answered: its line, the rest of the reaction reading it, then the turn's other reactions.
    const answered = worldAnswer(turned, h, 'clans')
    expect(answered.campaign.waiting).toBeUndefined()
    expect(texts(answered).slice(-3)).toEqual([
      'Who takes the bridge? The Clans',
      'Taken: clans',
      'After the bridge.',
    ])
    expect(answered.campaign.factions!.factions[0].values.strength).toBe(3)
    expect(worldAnswer(turned, h, 'vale').campaign.factions!.factions[0].values.strength).toBe(2)
  })

  it('a pause in a long jump: the days still to move come once it goes on, a trip’s too', () => {
    const h = host({
      world: waits({
        fair: {
          on: { when: { 'world.events': 'fair' } },
          do: [{ pause: 'The fair is on: stop and look.' }, { say: 'The fair is over.' }],
        },
      }),
    })
    const place = started()
    const day = 1440
    const start = place.campaign.world!.time
    const at = start + 2 * day
    const scheduled = worldAct(place, { type: 'schedule', event: { name: 'Fair', at } }, h)
    const jumped = worldAct(scheduled, { type: 'advance', minutes: 7 * day }, h)
    // Stopped at the fair's day, as it began.
    expect(jumped.campaign.world!.time).toBe(Math.floor(at / day) * day)
    expect(jumped.campaign.waiting).toMatchObject({
      reaction: 'fair',
      text: 'The fair is on: stop and look.',
      until: start + 7 * day,
    })
    // A trip moving on meanwhile: the world follows it once it goes on.
    const followed = followTrip(jumped, start + 8 * day, h)
    expect(followed.campaign.waiting!.until).toBe(start + 8 * day)
    const gone = worldAnswer(followed, h)
    expect(gone.campaign.world!.time).toBe(start + 8 * day)
    expect(texts(gone)).toContain('The fair is over.')
    // The turns due on the way came too (every two days).
    expect(texts(gone).filter((l) => l === 'clans: Pushes on').length).toBeGreaterThanOrEqual(3)
  })

  it('a full clock waits to start over until its reactions are done; pauses can be skipped', () => {
    const rules = waits({
      river: {
        on: 'world.clocks.march.full',
        do: [{ pause: true }, { say: 'The clans reach the river.' }],
      },
    })
    const place = started()
    const march = place.campaign.world!.clocks[0]
    const h = host({ world: rules })
    const full = worldAct(place, { type: 'tick', id: march.id, segments: 2 }, h)
    expect(full.campaign.world!.clocks[0].filled).toBe(2)
    expect(full.campaign.waiting).toEqual({
      reaction: 'river',
      rest: [
        { kind: 'steps', reaction: 'river', next: 1 },
        { kind: 'clockThen', id: march.id, then: 'reset' },
      ],
    })
    const done = worldAnswer(full, h)
    expect(done.campaign.world!.clocks[0].filled).toBe(0)
    expect(texts(done)).toContain('The clans reach the river.')
    // A trip going on that skips pauses: the world doesn't stop either.
    const skipped = worldAct(
      place,
      { type: 'tick', id: march.id, segments: 2 },
      host({ world: rules, skipPauses: true }),
    )
    expect(skipped.campaign.waiting).toBeUndefined()
    expect(skipped.campaign.world!.clocks[0].filled).toBe(0)
  })
})
