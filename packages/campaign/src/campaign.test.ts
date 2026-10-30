import { createMap, serializeMap, type HexMap } from '@open-tabletop/map'
import { createOracleEngine, loadPacks } from '@open-tabletop/oracle-engine'
import { seeded } from '@open-tabletop/random'
import { travelSystems } from '@open-tabletop/session'
import { describe, expect, it } from 'vitest'
import {
  bringFactions,
  CAMPAIGN_VERSION,
  CampaignFormatError,
  createCampaign,
  deserializeCampaign,
  freeName,
  factionsOn,
  hasWorld,
  joinCampaign,
  landIn,
  leaveTrip,
  openMap,
  otherTrip,
  playTrip,
  serializeCampaign,
  splitFactions,
  withNotes,
  withSetup,
  worldTurnOn,
  type Campaign,
} from './index'

/** Two factions: the clans in the hills (a region), the vale on one hex. */
const PACK = [
  { path: 'marks/pack.yaml', content: 'id: marks\nversion: 0.1.0\nlocale: en\nformat: 10\n' },
  { path: 'marks/system.yaml', content: 'kind: system\nname: Marks\nfactions: factions.default\n' },
  {
    path: 'marks/factions.yaml',
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
factions:
  clans:
    values: { strength: 4 }
    territory: { regions: [Hills] }
  vale:
    territory: { map: maps/north.otd.json, hexes: ['1,1'] }
---
kind: table
id: turn
roll: 1d1
entries:
  - range: 1
    result: Pushes on
    effects: { faction.territory: 1, faction.values.strength: -1, world.clocks.march: 1 }
`,
  },
  { path: 'marks/maps/north.otd.json', content: '{"otd":"0.2.0","maps":[]}' },
]

const { registry } = loadPacks(PACK)
const marks = travelSystems(registry).systems.find((s) => s.id === 'marks')!
const oracle = createOracleEngine({ registry, random: seeded(1) })

/** A small map with a region named Hills on two hexes. */
function hillsMap(campaign?: string): HexMap {
  const map = createMap('North')
  map.grid = { ...map.grid, width: 6, height: 6 }
  map.regions = [{ id: 'r1', name: 'Hills', color: '#888888' }]
  map.hexes['4,4'] = { region: 'r1' }
  map.hexes['4,5'] = { region: 'r1' }
  if (campaign) map.meta.campaign = campaign
  return map
}

describe('campaigns', () => {
  it('never share a name: a taken one gets the first number free', () => {
    expect(freeName('The Marches', ['North'])).toBe('The Marches')
    expect(freeName('The Marches', ['the marches '])).toBe('The Marches (2)')
    expect(freeName('The Marches', ['The Marches', 'The Marches (2)'])).toBe('The Marches (3)')
    expect(freeName('', [''])).toBe('')
  })

  it('play one trip at a time: another one is told which played last', () => {
    const map = { app: 'map', id: 'm1', name: 'North' }
    const trip = { app: 'travel', id: 't1', name: 'To Keld' }
    const c = createCampaign('c1')
    expect(otherTrip(c, trip)).toBeUndefined()
    const playing = playTrip(c, map)
    expect(otherTrip(playing, map)).toBeUndefined()
    expect(otherTrip(playing, trip)).toEqual(map)
    expect(playTrip(playing, map)).toBe(playing)
    expect(otherTrip(playTrip(playing, trip), map)).toEqual(trip)
    expect(leaveTrip(playing, trip)).toBe(playing)
    expect(leaveTrip(playing, map)).not.toHaveProperty('playing')
    // What the world had waiting for the trip leaves with it.
    const waiting = { ...playing, moments: [{ clock: 'Doom', at: ['world.clocks.doom.full'] }] }
    expect(leaveTrip(waiting, map)).not.toHaveProperty('moments')
  })

  it('read back what they wrote, and refuse what is not one', () => {
    const campaign: Campaign = {
      ...createCampaign('c1', 'The Marches', '2026-10-19T10:00:00.000Z'),
      noteRef: 'Campaigns/Marches',
      system: 'marks',
      packs: ['core'],
      world: { time: 1440, events: [], clocks: [], timeline: [], nextId: 1 },
      worldWeather: { weather: 'rain', day: 2 },
      factions: { system: 'marks', factions: [], lastTurn: 0, auto: false },
      oracle: { state: { decks: {}, occurrences: { 'a/b#c': 1 }, vars: {} }, history: [] },
      playing: { app: 'travel', id: 't1', name: 'To Keld' },
      moments: [
        {
          clock: 'The Wyrm wakes',
          at: ['world.clocks.wyrm.full', 'world.clocks.the-wyrm-wakes.full'],
        },
        { at: ['world.turn'] },
      ],
    }
    expect(deserializeCampaign(serializeCampaign(campaign))).toEqual(campaign)
    // Broken moments are dropped.
    const broken = JSON.stringify({ ...campaign, moments: [{ clock: 1 }, { at: [] }] })
    expect(deserializeCampaign(broken)).not.toHaveProperty('moments')
    // A v5 campaign's clocks waiting name what they're heard by.
    const v5 = JSON.stringify({
      ...campaign,
      version: 5,
      moments: [{ clock: 'The Wyrm wakes', ids: ['wyrm', 'the-wyrm-wakes'] }],
    })
    expect(deserializeCampaign(v5).moments).toEqual([campaign.moments![0]])
    // A v6 campaign's trip on a map was in the app `hexmapper`, now `map`.
    const v6 = JSON.stringify({
      ...campaign,
      version: 6,
      playing: { app: 'hexmapper', id: 'm1', name: 'North' },
    })
    expect(deserializeCampaign(v6).playing).toEqual({ app: 'map', id: 'm1', name: 'North' })
    expect(campaign.version).toBe(CAMPAIGN_VERSION)
    expect(() => deserializeCampaign('{oops')).toThrow(CampaignFormatError)
    expect(() => deserializeCampaign('{"version":1}')).toThrow(CampaignFormatError)
    const newer = JSON.stringify({ ...campaign, version: CAMPAIGN_VERSION + 1 })
    expect(() => deserializeCampaign(newer)).toThrow(/newerVersion/)
  })

  it('a map saved before campaigns makes one of its own, with its world', () => {
    const map = createMap('Old map')
    const world = { time: 2880, events: [], clocks: [], timeline: [], nextId: 3 }
    const factions = {
      system: 'marks',
      factions: [{ id: 'clans', sheet: 'marks/faction', values: { strength: 3 } }],
      territories: { clans: ['4,4'] },
      lastTurn: 1440,
    }
    const oracle = { state: { decks: {}, occurrences: {}, vars: { x: 1 } }, history: [] }
    const old = { ...JSON.parse(serializeMap(map)), version: 23, world, factions, oracle }
    delete old.meta.campaign
    const opened = openMap(JSON.stringify(old))
    expect(opened.map.meta.campaign).toBe(map.meta.id)
    expect(opened.map.territories).toEqual({ clans: ['4,4'] })
    expect(opened.campaign).toMatchObject({
      id: map.meta.id,
      name: 'Old map',
      world,
      oracle,
      factions: { system: 'marks', factions: factions.factions, lastTurn: 1440 },
    })
    expect(opened.campaign?.factions).not.toHaveProperty('territories')
    // Its factions as the map sees them: the campaign's, with their land here.
    expect(factionsOn(opened.campaign!, opened.map)?.territories).toEqual({ clans: ['4,4'] })
    // Saved again, the map brings nothing: its campaign is kept apart.
    expect(openMap(serializeMap(opened.map)).campaign).toBeUndefined()
  })

  it('take the system and packs a map chose before they were the campaign’s', () => {
    const map = createMap('Old map')
    const old = { ...JSON.parse(serializeMap(map)), version: 24 }
    old.meta = { ...old.meta, system: 'marks', packs: ['core', 'core'] }
    const opened = openMap(JSON.stringify(old))
    expect(opened.map.meta).not.toHaveProperty('system')
    // Its campaign is kept already: only the system and packs come, for it to take.
    expect(opened.campaign).toBeUndefined()
    expect(opened.setup).toEqual({ system: 'marks', packs: ['core'] })
    const kept = createCampaign(map.meta.campaign)
    expect(withSetup(kept, opened.setup)).toMatchObject({ system: 'marks', packs: ['core'] })
    // One that chose its own keeps it.
    const chosen = { ...kept, system: 'other' }
    expect(withSetup(chosen, opened.setup)).toBe(chosen)
    // The default system (by its old name too) is no choice.
    old.meta.system = 'generic'
    expect(openMap(JSON.stringify(old)).setup).toEqual({ packs: ['core'] })
    // Saved before campaigns, the campaign made from the map has them.
    const older = { ...old, version: 23, meta: { ...old.meta, system: 'marks' }, oracle: {} }
    delete older.meta.campaign
    expect(openMap(JSON.stringify(older)).campaign).toMatchObject({ system: 'marks' })
  })

  it('a place joining another campaign leaves its world behind, or brings it along', () => {
    const world = { time: 1440, events: [], clocks: [], timeline: [], nextId: 1 }
    const from: Campaign = {
      ...createCampaign('a', 'Mine'),
      system: 'marks',
      world,
      factions: {
        system: 'marks',
        factions: [{ id: 'clans', sheet: 'marks/faction' } as never],
        lastTurn: 0,
      },
    }
    const to: Campaign = {
      ...createCampaign('b', 'Theirs'),
      packs: ['core'],
      oracle: { state: { decks: {}, occurrences: {}, vars: {} }, history: [] },
      playing: { app: 'travel', id: 't1', name: 'To Keld' },
    }
    expect(hasWorld(from)).toBe(true)
    // An Oracle that rolled nothing is no world.
    expect(hasWorld(to)).toBe(false)
    expect(hasWorld({ ...to, oracle: { ...to.oracle!, history: [{} as never] } })).toBe(true)
    expect(joinCampaign(from, to, 'theirs')).toBe(to)
    const mine = joinCampaign(from, to, 'mine')
    expect(mine).toMatchObject({ id: 'b', name: 'Theirs', system: 'marks', world })
    expect(mine.factions).toEqual(from.factions)
    expect(mine.playing).toEqual(to.playing)
    // What the place didn't have, the campaign no longer has either.
    expect(mine).not.toHaveProperty('packs')
    expect(mine).not.toHaveProperty('oracle')
    // The map keeps the land of the factions the campaign has.
    const land = { clans: ['1,1'], gone: ['2,2'] }
    expect(landIn(mine, land)).toEqual({ clans: ['1,1'] })
    expect(landIn(to, land)).toBeUndefined()
  })

  it('keep the factions’ sheets, and each map the land they hold on it', () => {
    const map = hillsMap('c1')
    const campaign = createCampaign('c1')
    const north = { pack: 'marks', path: 'maps/north.otd.json' }
    const here = bringFactions(campaign, map, marks.factions!, 'marks', 60, north)
    expect(here.territories).toEqual({ clans: ['4,4', '4,5'], vale: ['1,1'] })
    // On a map that isn't the one the vale's hexes are on, only the regions.
    expect(bringFactions(campaign, map, marks.factions!, 'marks', 60).territories).toEqual({
      clans: ['4,4', '4,5'],
    })
    expect(here.lastTurn).toBe(60)
    const split = splitFactions(here)
    expect(split.factions).toEqual({
      system: 'marks',
      factions: here.factions,
      lastTurn: 60,
    })
    const withThem = { ...campaign, factions: split.factions }
    // A second map of the campaign: the same sheets, its own land (none for the vale, whose
    // hex it doesn't have).
    const south = hillsMap('c1')
    south.grid = { ...south.grid, width: 1, height: 1 }
    south.hexes = { '0,0': { region: 'r1' } }
    const there = bringFactions(withThem, south, marks.factions!, 'marks', 600)
    expect(there.factions).toBe(withThem.factions!.factions)
    expect(there.lastTurn).toBe(60)
    expect(there.territories).toEqual({ clans: ['0,0'] })
    // Without a map (the Campaign app, a campaign with no maps yet): their sheets, no land.
    const alone = bringFactions(campaign, undefined, marks.factions!, 'marks', 60)
    expect(alone.factions.map((f) => f.id)).toEqual(['clans', 'vale'])
    expect(alone.territories).toEqual({})
    expect(bringFactions(withThem, undefined, marks.factions!, 'marks', 600)).toEqual({
      ...withThem.factions,
      territories: {},
    })
    // The land of a faction the campaign no longer has is not shown.
    const gone = { ...withThem, factions: { ...split.factions!, factions: [] } }
    expect(factionsOn(gone, { ...map, territories: split.territories })?.territories).toEqual({})
  })

  it('play a world turn on a map: sheets and Oracle in the campaign, land on the map', () => {
    const map = hillsMap('c1')
    const start = bringFactions(createCampaign('c1'), map, marks.factions!, 'marks', 0, {
      pack: 'marks',
      path: 'maps/north.otd.json',
    })
    const split = splitFactions(start)
    const done = worldTurnOn(
      {
        campaign: { ...createCampaign('c1'), factions: split.factions },
        map: { ...map, ...split },
      },
      { system: marks.factions!, oracle, random: seeded(7), time: 1440 },
    )
    expect(done.lines.map((l) => [l.faction, l.text])).toEqual([
      ['clans', 'Pushes on'],
      ['vale', 'Pushes on'],
    ])
    expect(done.campaign.factions?.lastTurn).toBe(1440)
    expect(done.campaign.factions?.factions[0].values.strength).toBe(3)
    expect(done.campaign.oracle).toBeDefined()
    expect(done.map.territories?.clans).toHaveLength(3)
    expect(done.map.territories?.vale).toHaveLength(2)
    expect(done.ticks).toEqual({ march: 2 })
    // Without factions, nothing happens.
    const none = worldTurnOn(
      { campaign: createCampaign('c2'), map },
      { system: marks.factions!, oracle, random: seeded(7), time: 1 },
    )
    expect(none.lines).toEqual([])
  })
})

describe('notes on each faction', () => {
  it('keep a link and a short note per faction, the empty ones left out, through the file', () => {
    const own = { system: 'marks', factions: [], lastTurn: 0 }
    const noted = withNotes(own, 'vale', { noteRef: 'Factions/The Vale', note: 'Owes us.' })
    expect(noted.notes).toEqual({ vale: { noteRef: 'Factions/The Vale', note: 'Owes us.' } })
    // Clearing the link keeps the note; clearing both takes the faction's notes away.
    const linkless = withNotes(noted, 'vale', { noteRef: '  ' })
    expect(linkless.notes).toEqual({ vale: { note: 'Owes us.' } })
    expect(withNotes(linkless, 'vale', { note: '' })).toEqual(own)
    // Saved and read back with the campaign.
    const campaign = { ...createCampaign('c1', 'Marks'), factions: noted }
    expect(deserializeCampaign(serializeCampaign(campaign)).factions?.notes).toEqual(noted.notes)
  })
})
