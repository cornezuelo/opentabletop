/// <reference types="vite/client" />
import { strToU8, unzipSync, zipSync } from 'fflate'
import { describe, expect, it } from 'vitest'
import { ROSTER_KEY, USER_PACKS_KEY } from '@open-tabletop/storage'
import {
  EXPORT_MANIFEST,
  exportFileName,
  imageUses,
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
    import.meta.glob<string>('../../../apps/map/src/lib/play/old-maps/v0.17.0-pending.json', {
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

  it('carries the pictures the chosen things name, and only those', () => {
    const { kept } = storage()
    const image = (id: string) => ({
      id,
      name: id,
      modified: '2026-11-20',
      json: JSON.stringify({ format: 1, data: 'data:image/webp;base64,UklGR', tags: [] }),
    })
    const pictured: Kept = {
      ...kept,
      characters: kept.characters.map((e) => {
        const character = e.character as Record<string, unknown>
        return { ...e, character: { ...character, picture: `${String(character.id)}-face` } }
      }),
      images: [image('brenna-face'), image('tobin-face'), image('unused')],
    }
    const chosen = withMissing(listItems(pictured), new Set(['trip:trip-1']))
    expect(chosen.has('character:tobin')).toBe(false)
    const zip = writeExport(pictured, chosen, '2026-11-20T10:00:00.000Z')
    expect(Object.keys(unzipSync(zip)).filter((f) => f.startsWith('images/'))).toEqual([
      'images/brenna-face.json',
    ])
    const read = readExport(zip).kept!
    expect(read.images).toEqual([image('brenna-face')])
    expect(planImport({}, read, chosen).putImages).toEqual([image('brenna-face')])
    // An export made before images has none.
    expect(readExport(writeExport(kept, chosen)).kept!.images).toEqual([])
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

describe('where an image is used', () => {
  it('names what uses each image: characters, what they hold, trips, maps, definitions', () => {
    const { kept } = storage()
    const map = JSON.parse(exampleMap) as Record<string, unknown>
    const used: Kept = {
      ...kept,
      maps: [
        {
          ...kept.maps[0],
          json: JSON.stringify({ ...map, assets: [{ id: 'tower', name: 'Tower', dataUrl: 'x' }] }),
        },
      ],
      trips: [
        {
          ...kept.trips[0],
          party: {
            name: 'The Company',
            picture: 'banner',
            members: [{ name: 'Brenna', picture: 'face' }],
          },
        },
      ],
      characters: [
        {
          character: {
            id: 'brenna',
            name: 'Brenna',
            picture: 'face',
            items: [{ id: 'rope', name: 'Rope', picture: 'rope' }],
          },
          modified: '2026-10-01',
        },
      ],
    }
    const uses = imageUses(used, {
      'items:core/gear#rope': 'rope',
      'templates:grey-marches/bestiary#wolf': 'wolf',
    })
    expect(uses.face).toEqual([
      { kind: 'trip', name: 'To the salt lake', part: 'Brenna' },
      { kind: 'character', name: 'Brenna' },
    ])
    expect(uses.banner).toEqual([{ kind: 'trip', name: 'To the salt lake', part: 'The Company' }])
    expect(uses.rope).toEqual([
      { kind: 'character', name: 'Brenna', part: 'Rope' },
      { kind: 'definition', definition: 'items', name: 'rope', part: 'core/gear' },
    ])
    expect(uses.wolf).toEqual([
      { kind: 'definition', definition: 'templates', name: 'wolf', part: 'grey-marches/bestiary' },
    ])
    expect(uses.tower).toEqual([{ kind: 'map', name: 'The Grey Marches' }])
    // Nothing in the example map or its campaign names an image of the library.
    expect(Object.keys(uses).sort()).toEqual(['banner', 'face', 'rope', 'tower', 'wolf'])
  })

  it('names the pages of Notes and the notes of a campaign’s Log that show one', () => {
    const { kept } = storage()
    const uses = imageUses({
      ...kept,
      notes: [
        {
          id: 'p1',
          name: 'npcs/Old Tobin',
          modified: '',
          json: JSON.stringify({ format: 1, path: 'npcs/Old Tobin', body: '![](picture:dog)' }),
        },
      ],
      journals: [
        {
          id: campaignId,
          name: campaignId,
          modified: '',
          json: JSON.stringify({ items: [{ kind: 'note', text: 'Saw ![it](picture:dog)' }] }),
        },
      ],
    })
    expect(uses.dog).toEqual([
      { kind: 'page', name: 'Old Tobin' },
      { kind: 'journal', name: kept.campaigns[0].name },
    ])
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
