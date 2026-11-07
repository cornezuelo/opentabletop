import { describe, expect, it, vi } from 'vitest'
import { render } from 'svelte/server'
import { createMap } from '@open-tabletop/map'
import { shownAt } from '@open-tabletop/session'
import PlayStrip from '../../components/PlayStrip.svelte'
import { editor } from '../store/editor.svelte'
import { clickHex, sessionOf, setMode, step } from './play'

describe('the strip over the map', () => {
  it('says what happened last, the journal’s newest line, and what to do next', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    editor.load(createMap())
    editor.switchMode('play')
    setMode('rules')
    clickHex('1,1')
    clickHex('4,1')
    step({ type: 'action', id: 'march', with: { until: 'destination' } })
    const session = sessionOf(editor.map.play!)!
    const last = session.journal.findLast((e) => shownAt(e, { level: 'mechanics' }))!
    const html = render(PlayStrip).body
    expect(html).toContain('class="last')
    // The line in words, never its code.
    expect(html).not.toContain(last.code)
    // Having arrived, it says what to do next, not "You've arrived" again.
    expect(session.travel.location).toBe('4,1')
    expect(html).not.toContain('arrived')
    expect(html).toContain('set a new destination')
    editor.switchMode('edit')
    vi.restoreAllMocks()
  })
})
