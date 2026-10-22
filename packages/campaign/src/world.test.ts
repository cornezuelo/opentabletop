import { createMap, type HexMap } from '@open-tabletop/map'
import { createOracleEngine, loadPacks } from '@open-tabletop/oracle-engine'
import { seeded } from '@open-tabletop/random'
import { calendarOf, travelSystems } from '@open-tabletop/session'
import type { WeatherModel } from '@open-tabletop/weather-engine'
import { describe, expect, it } from 'vitest'
import {
  bringFactions,
  createCampaign,
  followTrip,
  missingClocks,
  playTrip,
  startWorld,
  takeMoments,
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
  { path: 'marks/pack.yaml', content: 'id: marks\nversion: 0.1.0\nlocale: en\nformat: 5\n' },
  {
    path: 'marks/system.yaml',
    content: 'kind: system\nname: Marks\nfactions: factions.default\nclocks: clocks.default\n',
  },
  {
    path: 'marks/world.yaml',
    content: `
kind: sheet
id: faction
values:
  strength: { default: 2, min: 0, max: 6 }
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
    onFull:
      description: The clans reach the river.
      effects: { factions.clans.values.strength: 3 }
      then: reset
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
    fallback: 'en',
    weather: sky,
    factions: marks.factions,
    oracle: createOracleEngine({ registry, random: seeded(1) }),
    random: seeded(2),
    locale: 'en',
    words: {
      clockFull: (full) => [full.description, full.then].filter(Boolean).join(' '),
      factionLine: (_, line) => `${line.faction}: ${line.text}`,
    },
    ...over,
  }
}

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
      { clock: 'march', ids: ['march'] },
      { clock: 'The Wyrm wakes!', ids: ['the-wyrm-wakes'] },
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
})
