import { describe, expect, it } from 'vitest'
import {
  backupFileName,
  createBackup,
  FAVORITES_KEY,
  isAppKey,
  parseBackup,
  planRestore,
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
    expect(isAppKey('someone-else')).toBe(false)
    const backup = createBackup(
      { 'opentabletop.locale': 'es', 'hexmapper.pending': '{}', other: 'x' },
      [map('a', '2026-10-01')],
      new Date(2026, 9, 7, 1).toISOString(),
    )
    expect(backup.storage).toEqual({ 'opentabletop.locale': 'es' })
    expect(backupFileName(backup.created)).toBe('opentabletop-backup-2026-10-07.json')
  })

  it('read back what they wrote and reject what isn’t one', () => {
    const backup = createBackup({ [USER_PACKS_KEY]: packs('mine') }, [map('a', '2026-10-01')])
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
  }
  const backup = createBackup(
    {
      'opentabletop.travel.trip': '{}',
      [USER_PACKS_KEY]: JSON.stringify([{ root: 'shared', files: [{ path: 'x', content: '' }] }]),
      [FAVORITES_KEY]: JSON.stringify(['core/b']),
    },
    [map('both', '2026-10-01'), map('new', '2026-10-02')],
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
  })

  it('merge: adds the backup, keeping newer maps and joining packs and favorites', () => {
    const plan = planRestore(current, backup, 'merge')
    // Mine is newer than the backup's "both".
    expect(plan.putMaps.map((m) => m.id)).toEqual(['new'])
    expect(plan.removeMaps).toEqual([])
    expect(plan.storage['opentabletop.locale']).toBeUndefined()
    expect(plan.storage['opentabletop.travel.trip']).toBe('{}')
    const merged = JSON.parse(plan.storage[USER_PACKS_KEY]!) as { root: string; files: [] }[]
    expect(merged.map((p) => p.root)).toEqual(['mine', 'shared'])
    expect(merged[1].files).toHaveLength(1) // the backup's copy of "shared"
    expect(JSON.parse(plan.storage[FAVORITES_KEY]!)).toEqual(['core/a', 'core/b'])
  })
})
