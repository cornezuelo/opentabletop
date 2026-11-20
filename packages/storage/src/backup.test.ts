import { describe, expect, it } from 'vitest'
import {
  backupFileName,
  createBackup,
  FAVORITES_KEY,
  isAppKey,
  parseBackup,
  planRestore,
  ROSTER_KEY,
  summarize,
  USER_PACKS_KEY,
} from './index'

const map = (id: string, modified: string) => ({ id, name: id, modified, json: `{"id":"${id}"}` })
const packs = (...roots: string[]) => JSON.stringify(roots.map((root) => ({ root, files: [] })))

describe('backups', () => {
  it('keep only the apps’ keys, never the crash copy of the open map', () => {
    expect(isAppKey('opentabletop.userPacks')).toBe(true)
    expect(isAppKey('hexmapper.preferences')).toBe(true)
    expect(isAppKey('hexmapper.pending')).toBe(false)
    expect(isAppKey('hexmapper.pendingCampaign')).toBe(false)
    expect(isAppKey('someone-else')).toBe(false)
    const backup = createBackup(
      { 'opentabletop.locale': 'es', 'hexmapper.pending': '{}', other: 'x' },
      [map('a', '2026-10-01')],
      [],
      [],
      [],
      new Date(2026, 9, 7, 1).toISOString(),
    )
    expect(backup.storage).toEqual({ 'opentabletop.locale': 'es' })
    expect(backupFileName(backup.created)).toBe('opentabletop-backup-2026-10-07.json')
  })

  it('read back what they wrote and reject what isn’t one', () => {
    const backup = createBackup(
      { [USER_PACKS_KEY]: packs('mine') },
      [map('a', '2026-10-01')],
      [map('c', '2026-10-01')],
    )
    expect(parseBackup(JSON.stringify(backup)).backup).toEqual(backup)
    expect(summarize(backup)).toMatchObject({ maps: 1, packs: 1 })
    expect(parseBackup('{oops').error).toBe('invalid')
    expect(parseBackup('{"otd":"0.2.0"}').error).toBe('invalid')
    expect(parseBackup(JSON.stringify({ ...backup, version: 99 })).error).toBe('newer')
    // Broken entries are dropped, the rest survives.
    const messy = { ...backup, maps: [map('b', 'x'), { id: 3 }], storage: { other: 'x', a: 1 } }
    const parsed = parseBackup(JSON.stringify(messy)).backup!
    expect(parsed.maps.map((m) => m.id)).toEqual(['b'])
    expect(parsed.storage).toEqual({})
  })

  it('read those made before campaigns, with none', () => {
    const v1 = { ...createBackup({}, [map('a', '2026-10-01')], []), version: 1 } as Record<
      string,
      unknown
    >
    delete v1.campaigns
    const parsed = parseBackup(JSON.stringify(v1)).backup!
    expect(parsed.maps.map((m) => m.id)).toEqual(['a'])
    expect(parsed.campaigns).toEqual([])
  })
})

describe('restoring', () => {
  const current = {
    storage: {
      'opentabletop.locale': 'en',
      'hexmapper.pending': '{}',
      [USER_PACKS_KEY]: packs('mine', 'shared'),
      [FAVORITES_KEY]: JSON.stringify(['core/a']),
    },
    maps: [map('old', '2026-10-05'), map('both', '2026-10-06')],
    campaigns: [map('gone', '2026-10-05'), map('mine', '2026-10-09')],
  }
  const backup = createBackup(
    {
      'opentabletop.travel.trip': '{}',
      [USER_PACKS_KEY]: JSON.stringify([{ root: 'shared', files: [{ path: 'x', content: '' }] }]),
      [FAVORITES_KEY]: JSON.stringify(['core/b']),
    },
    [map('both', '2026-10-01'), map('new', '2026-10-02')],
    [map('mine', '2026-10-01'), map('theirs', '2026-10-01')],
  )

  it('replace: this browser ends up like the backup', () => {
    const plan = planRestore(current, backup, 'replace')
    expect(plan.storage).toEqual({
      'opentabletop.locale': null,
      'hexmapper.pending': null,
      ...backup.storage,
    })
    expect(plan.putMaps.map((m) => m.id)).toEqual(['both', 'new'])
    expect(plan.removeMaps).toEqual(['old'])
    expect(plan.putCampaigns.map((c) => c.id)).toEqual(['mine', 'theirs'])
    expect(plan.removeCampaigns).toEqual(['gone'])
  })

  it('merge: adds the backup, keeping newer maps and joining packs and favorites', () => {
    const plan = planRestore(current, backup, 'merge')
    // Mine is newer than the backup's "both".
    expect(plan.putMaps.map((m) => m.id)).toEqual(['new'])
    expect(plan.removeMaps).toEqual([])
    // …and campaigns the same way.
    expect(plan.putCampaigns.map((c) => c.id)).toEqual(['theirs'])
    expect(plan.removeCampaigns).toEqual([])
    expect(plan.storage['opentabletop.locale']).toBeUndefined()
    expect(plan.storage['opentabletop.travel.trip']).toBe('{}')
    const merged = JSON.parse(plan.storage[USER_PACKS_KEY]!) as { root: string; files: [] }[]
    expect(merged.map((p) => p.root)).toEqual(['mine', 'shared'])
    expect(merged[1].files).toHaveLength(1) // the backup's copy of "shared"
    expect(JSON.parse(plan.storage[FAVORITES_KEY]!)).toEqual(['core/a', 'core/b'])
  })

  it('merge: joins the roster’s characters, the one changed last kept', () => {
    const roster = (...entries: [string, string, number][]) =>
      JSON.stringify({
        version: 1,
        characters: entries.map(([id, modified, health]) => ({
          character: { id, sheet: 's', values: { health } },
          modified,
        })),
      })
    const here = {
      storage: { [ROSTER_KEY]: roster(['kael', '2026-10-05', 3], ['mara', '2026-10-01', 5]) },
      maps: [],
      campaigns: [],
    }
    const theirs = createBackup(
      {
        [ROSTER_KEY]: roster(
          ['kael', '2026-10-02', 9],
          ['mara', '2026-10-03', 1],
          ['tobin', 'T', 2],
        ),
      },
      [],
      [],
    )
    const merged = JSON.parse(planRestore(here, theirs, 'merge').storage[ROSTER_KEY]!) as {
      version: number
      characters: { character: { id: string; values: { health: number } } }[]
    }
    expect(merged.version).toBe(1)
    // Kael changed here last; Mara in the backup; Tobin only the backup has.
    expect(merged.characters.map((e) => [e.character.id, e.character.values.health])).toEqual([
      ['kael', 3],
      ['mara', 1],
      ['tobin', 2],
    ])
  })
})

describe('images in backups', () => {
  const image = (id: string, modified: string) => ({
    id,
    name: id,
    modified,
    json: JSON.stringify({
      format: 1,
      data: 'data:image/webp;base64,AA',
      width: 1,
      height: 1,
      tags: [],
    }),
  })

  it('are kept and read back; older backups have none', () => {
    const backup = createBackup({}, [], [], [image('wolf', '2026-11-01')])
    expect(parseBackup(JSON.stringify(backup)).backup!.images.map((i) => i.id)).toEqual(['wolf'])
    expect(summarize(backup).images).toBe(1)
    const v2 = { ...backup, version: 2 } as Record<string, unknown>
    delete v2.images
    expect(parseBackup(JSON.stringify(v2)).backup!.images).toEqual([])
  })

  it('merge by id, the newer kept; replace leaves only the backup’s', () => {
    const here = {
      storage: {},
      maps: [],
      campaigns: [],
      images: [image('wolf', '2026-11-05'), image('mine', '2026-11-01')],
    }
    const theirs = createBackup(
      {},
      [],
      [],
      [image('wolf', '2026-11-02'), image('crow', '2026-11-01')],
    )
    const merged = planRestore(here, theirs, 'merge')
    expect(merged.putImages.map((i) => i.id)).toEqual(['crow'])
    expect(merged.removeImages).toEqual([])
    const replaced = planRestore(here, theirs, 'replace')
    expect(replaced.putImages.map((i) => i.id)).toEqual(['wolf', 'crow'])
    expect(replaced.removeImages).toEqual(['mine'])
  })
})

describe('the campaigns’ journals', () => {
  const journal = (id: string, modified: string) => ({ id, name: id, modified, json: '{}' })

  it('are kept and read back; older backups have none', () => {
    const backup = createBackup({}, [], [], [], [journal('c1', '2026-11-20')])
    expect(parseBackup(JSON.stringify(backup)).backup!.journals.map((j) => j.id)).toEqual(['c1'])
    const v3 = { ...backup, version: 3 } as Record<string, unknown>
    delete v3.journals
    expect(parseBackup(JSON.stringify(v3)).backup!.journals).toEqual([])
  })

  it('merge by campaign, the newer kept; replace leaves only the backup’s', () => {
    const here = {
      storage: {},
      maps: [],
      campaigns: [],
      journals: [journal('c1', '2026-11-20'), journal('mine', '2026-11-01')],
    }
    const theirs = createBackup(
      {},
      [],
      [],
      [],
      [journal('c1', '2026-11-19'), journal('c2', '2026-11-01')],
    )
    const merged = planRestore(here, theirs, 'merge')
    expect(merged.putJournals.map((j) => j.id)).toEqual(['c2'])
    const replaced = planRestore(here, theirs, 'replace')
    expect(replaced.putJournals.map((j) => j.id)).toEqual(['c1', 'c2'])
    expect(replaced.removeJournals).toEqual(['mine'])
  })
})
