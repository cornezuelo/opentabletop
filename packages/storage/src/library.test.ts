import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { createLibrary, type LibraryEntry } from './library'

const entry = (id: string, json = '{}'): LibraryEntry => ({
  id,
  name: id,
  modified: '2026-10-30T10:00:00Z',
  json,
})

/** A database as versions up to v0.25.0 kept it, under the Hexmapper's name. */
function oldDatabase(stores: Record<string, LibraryEntry[]>): Promise<void> {
  return new Promise((resolve, reject) => {
    const open = indexedDB.open('hexmapper', 3)
    open.onupgradeneeded = () => {
      for (const name of Object.keys(stores)) open.result.createObjectStore(name, { keyPath: 'id' })
    }
    open.onsuccess = () => {
      const db = open.result
      const tx = db.transaction(Object.keys(stores), 'readwrite')
      for (const [name, entries] of Object.entries(stores))
        for (const e of entries) tx.objectStore(name).put(e)
      tx.oncomplete = () => {
        db.close()
        resolve()
      }
      tx.onerror = () => reject(tx.error)
    }
    open.onerror = () => reject(open.error)
  })
}

describe('the libraries kept under the Hexmapper’s name', () => {
  it('move to the new database once, and the old one is deleted', async () => {
    await oldDatabase({
      library: [entry('north'), entry('south')],
      campaigns: [entry('marches')],
    })
    const maps = createLibrary('library', 'test.maps')
    const campaigns = createLibrary('campaigns', 'test.campaigns')
    expect((await maps.list()).map((m) => m.id).sort()).toEqual(['north', 'south'])
    expect((await campaigns.get('marches'))?.name).toBe('marches')
    const names = (await indexedDB.databases()).map((d) => d.name)
    expect(names).toContain('opentabletop')
    expect(names).not.toContain('hexmapper')
    // What's written from now on stays in the new one.
    await maps.put(entry('east'))
    expect(await maps.list()).toHaveLength(3)
  })
})
