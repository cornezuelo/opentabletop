import { describe, expect, it } from 'vitest'
import { LIBRARY_CHANNEL, onLibraryChange, type LibraryChange } from './mapLibrary'

describe('changes to the map library', () => {
  it('are heard from other windows, until the listener stops', async () => {
    const heard: LibraryChange[] = []
    const stop = onLibraryChange((change) => heard.push(change))
    const otherWindow = new BroadcastChannel(LIBRARY_CHANNEL)
    otherWindow.postMessage({ type: 'put', id: 'map1', modified: '2026-10-19T10:00:00Z' })
    otherWindow.postMessage('not a change')
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(heard).toEqual([{ type: 'put', id: 'map1', modified: '2026-10-19T10:00:00Z' }])
    stop()
    otherWindow.postMessage({ type: 'delete', id: 'map1' })
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(heard).toHaveLength(1)
    otherWindow.close()
  })
})
