/// <reference types="vite/client" />
import { strToU8, unzipSync, zipSync } from 'fflate'
import { describe, expect, it } from 'vitest'
import { ROSTER_KEY, USER_PACKS_KEY } from '@open-tabletop/storage'
import {
  EXPORT_MANIFEST,
  exportFileName,
  importStatus,
  keysOf,
  listItems,
  missing,
  planImport,
  readExport,
  readKept,
  TRIPS_KEY,
  withMissing,
  writeExport,
  type Kept,
} from './index'

/** The Grey Marches' example map and its campaign, as the map library and the campaigns keep them. */
const stored = JSON.parse(
  Object.values(
    import.meta.glob<string>('../../../apps/hexmapper/src/lib/play/old-maps/v0.17.0-pending.json', {
      query: '?raw',
      import: 'default',
      eager: true,
    }),
  )[0],
) as { map: { meta: { id: string; campaign: string } }; campaign: Record<string, unknown> }
const exampleMap = JSON.stringify(stored.map)

const pack = (root: string, dependencies = '') => ({
  root,
  files: [
    {
      path: 'pack.yaml',
      content: `id: ${root}\nname: Pack ${root}\nversion: 1.0.0\n${dependencies}`,
    },
    { path: 'tables.yaml', content: `kind: table\nid: t\n` },
  ],
})

const campaignId = stored.map.meta.campaign

/** A browser with a homebrew pack on top of the Grey Marches, the example map, a trip and two characters. */
function storage(): { storage: Record<string, string>; kept: Kept } {
  const storage = {
    [USER_PACKS_KEY]: JSON.stringify([
      {
        ...pack('homebrew', 'dependencies: { grey-marches: ">=0.1.0", lore: "*" }'),
        origin: 'user',
      },
      { ...pack('lore'), origin: 'user' },
      { ...pack('kal-arath'), origin: 'user' },
    ]),
    [TRIPS_KEY]: JSON.stringify({
      version: 10,
      current: 'trip-1',
      trips: [
        {
          id: 'trip-1',
          name: 'To the salt lake',
          system: 'homebrew',
          campaign: campaignId,
          way: [{}],
        },
      ],
    }),
    [ROSTER_KEY]: JSON.stringify({
      version: 1,
      characters: [
        {
          character: { id: 'brenna', name: 'Brenna', sheet: 'grey-marches/companion' },
          modified: '2026-10-01',
          playing: { app: 'travel', id: 'trip-1', name: 'To the salt lake' },
        },
        {
          character: { id: 'tobin', name: 'Tobin', sheet: 'homebrew/hero' },
          modified: '2026-10-01',
        },
      ],
    }),
  }
  const maps = [
    { id: 'example', name: 'The Grey Marches', modified: '2026-10-01', json: exampleMap },
  ]
  const campaigns = [
    {
      id: campaignId,
      name: 'The Grey Marches',
      modified: '2026-10-01',
      json: JSON.stringify({ ...stored.campaign, system: 'homebrew/variant', packs: ['lore'] }),
    },
  ]
  return { storage, kept: readKept(storage, maps, campaigns) }
}

describe('what can be exported', () => {
  it('lists the packs, campaigns, maps, trips and characters, with what each needs', () => {
    const items = listItems(storage().kept, new Set(['kal-arath']))
    expect(items.map((i) => i.key)).toEqual([
      'pack:homebrew',
      'pack:lore',
      'pack:kal-arath',
      `campaign:${campaignId}`,
      'map:example',
      'trip:trip-1',
      'character:brenna',
      'character:tobin',
    ])
    const of = (key: string) => items.find((i) => i.key === key)!
    expect(of('pack:homebrew').name).toBe('Pack homebrew')
    expect(of('pack:homebrew').needs).toEqual([
      { key: 'pack:grey-marches', why: 'dependency' },
      { key: 'pack:lore', why: 'dependency' },
    ])
    expect(of('pack:kal-arath').personal).toBe(true)
    expect(of(`campaign:${campaignId}`).needs).toEqual([
      { key: 'pack:homebrew', why: 'system' },
      { key: 'pack:lore', why: 'packs' },
    ])
    // The example map and the trip are in the campaign, and Brenna travels in the trip.
    expect(of('map:example').campaign).toBe(`campaign:${campaignId}`)
    expect(of('trip:trip-1').needs).toEqual([
      { key: `campaign:${campaignId}`, why: 'campaign' },
      { key: 'pack:homebrew', why: 'system' },
      { key: 'character:brenna', why: 'member' },
    ])
    expect(of('character:brenna').needs).toEqual([
      { key: 'pack:grey-marches', why: 'system' },
      { key: 'trip:trip-1', why: 'place' },
    ])
  })

  it('a party needs its members', () => {
    const party = {
      character: { id: 'the-company', sheet: 'grey-marches/company', name: 'The Company' },
      modified: 'T',
      members: ['brenna'],
    }
    const kept = storage().kept
    const items = listItems({ ...kept, characters: [...kept.characters, party] })
    expect(items.find((i) => i.key === 'character:the-company')!.needs).toEqual([
      { key: 'pack:grey-marches', why: 'system' },
      { key: 'character:brenna', why: 'party' },
    ])
  })

  it('says what a choice leaves out, and adds it all', () => {
    const items = listItems(storage().kept)
    const chosen = new Set(['trip:trip-1'])
    // The Grey Marches come with the apps: never asked for.
    expect(missing(items, chosen).map((m) => [m.item.key, m.target.key, m.need.why])).toEqual([
      ['trip:trip-1', `campaign:${campaignId}`, 'campaign'],
      ['trip:trip-1', 'pack:homebrew', 'system'],
      ['trip:trip-1', 'character:brenna', 'member'],
    ])
    const all = withMissing(items, chosen)
    expect([...all].sort()).toEqual(
      [
        `campaign:${campaignId}`,
        'character:brenna',
        'pack:homebrew',
        'pack:lore',
        'trip:trip-1',
      ].sort(),
    )
    expect(missing(items, all)).toEqual([])
    // What the browser importing has already isn't missing.
    expect(
      missing(
        items,
        chosen,
        new Set([`campaign:${campaignId}`, 'pack:homebrew', 'character:brenna']),
      ),
    ).toEqual([])
  })
})

describe('an export', () => {
  it('holds what was chosen, and reads back the same', () => {
    const { kept } = storage()
    const chosen = withMissing(listItems(kept), new Set(['map:example', 'trip:trip-1']))
    const zip = writeExport(kept, chosen, '2026-10-29T10:00:00.000Z')
    const files = Object.keys(unzipSync(zip)).sort()
    expect(files).toEqual([
      `campaigns/${encodeURIComponent(campaignId)}.json`,
      'characters/brenna.json',
      'maps/example.json',
      EXPORT_MANIFEST,
      'packs/homebrew/pack.yaml',
      'packs/homebrew/tables.yaml',
      'packs/lore/pack.yaml',
      'packs/lore/tables.yaml',
      'trips/trip-1.json',
    ])
    const read = readExport(zip)
    expect(read.created).toBe('2026-10-29T10:00:00.000Z')
    expect(keysOf(read.kept!)).toEqual(chosen)
    expect(read.kept!.maps[0]).toEqual(kept.maps[0])
    expect(read.kept!.trips).toEqual(kept.trips)
    expect(read.kept!.packs.find((p) => p.root === 'homebrew')!.files).toEqual(kept.packs[0].files)
    expect(exportFileName(new Date(2026, 9, 29, 10).toISOString())).toBe(
      'opentabletop-export-2026-10-29.zip',
    )
  })

  it('refuses what isn’t one, and one of a newer version', () => {
    expect(readExport(strToU8('not a zip')).error).toBe('invalid')
    expect(readExport(zipSync({ 'pack.yaml': strToU8('id: x') })).error).toBe('invalid')
    const newer = zipSync({
      [EXPORT_MANIFEST]: strToU8(JSON.stringify({ format: 'opentabletop-export', version: 99 })),
    })
    expect(readExport(newer).error).toBe('newer')
  })
})

describe('importing', () => {
  it('tells what’s new, what’s already here and what would replace yours', () => {
    const { kept } = storage()
    const here: Kept = {
      ...kept,
      packs: [kept.packs[1]],
      trips: [{ ...kept.trips[0], name: 'Renamed here' }],
      characters: [],
      maps: [],
    }
    const status = importStatus(here, kept)
    expect(status.get('pack:homebrew')).toBe('new')
    expect(status.get('pack:lore')).toBe('same')
    expect(status.get('trip:trip-1')).toBe('changed')
    expect(status.get('map:example')).toBe('new')
    expect(status.get(`campaign:${campaignId}`)).toBe('same')
  })

  it('adds the chosen things beside what’s here, replacing what has their id', () => {
    const { kept } = storage()
    const here = {
      [USER_PACKS_KEY]: JSON.stringify([
        { ...pack('lore'), origin: 'user', note: 'mine' },
        { ...pack('other'), origin: 'user' },
      ]),
      [TRIPS_KEY]: JSON.stringify({
        version: 10,
        current: 'mine',
        trips: [
          { id: 'mine', way: [{}] },
          { id: 'trip-1', name: 'Old', way: [{}] },
        ],
      }),
      [ROSTER_KEY]: JSON.stringify({
        version: 1,
        characters: [{ character: { id: 'mara', sheet: 'core/hero' }, modified: '2026-01-01' }],
      }),
    }
    const plan = planImport(
      here,
      kept,
      new Set(['pack:lore', 'trip:trip-1', 'character:brenna', 'map:example']),
    )
    expect(
      JSON.parse(plan.storage[USER_PACKS_KEY]).map((p: { root: string; note?: string }) => [
        p.root,
        p.note,
      ]),
    ).toEqual([
      ['other', undefined],
      ['lore', undefined],
    ])
    const trips = JSON.parse(plan.storage[TRIPS_KEY])
    expect(trips.current).toBe('mine')
    expect(trips.trips.map((t: { id: string; name?: string }) => [t.id, t.name])).toEqual([
      ['mine', undefined],
      ['trip-1', 'To the salt lake'],
    ])
    const roster = JSON.parse(plan.storage[ROSTER_KEY])
    expect(roster.characters.map((e: { character: { id: string } }) => e.character.id)).toEqual([
      'mara',
      'brenna',
    ])
    expect(plan.putMaps.map((m) => [m.id, m.json === exampleMap])).toEqual([['example', true]])
    expect(plan.putCampaigns).toEqual([])
    // Nothing chosen of a kind: its entry is left alone.
    expect(planImport(here, kept, new Set(['map:example'])).storage).toEqual({})
  })
})
