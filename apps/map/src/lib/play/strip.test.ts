import { describe, expect, it, vi } from 'vitest'
import { render } from 'svelte/server'
import { createMap } from '@open-tabletop/map'
import { shownAt } from '@open-tabletop/session'
import PlayStrip from '../../components/PlayStrip.svelte'
import { editor } from '../store/editor.svelte'
import { clickHex, editSession, sessionOf, setMode, step } from './play'

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
    // Arriving is the newest line, which the strip says already: what came before it shows.
    expect(last.code).toBe('DESTINATION_REACHED')
    const html = render(PlayStrip).body
    expect(html).not.toContain('Destination reached')
    expect(html).toContain('class="last')
    // The line in words, never its code.
    expect(html).not.toContain(last.code)
    // Having arrived, it says what to do next, not "You've arrived" again.
    expect(session.travel.location).toBe('4,1')
    expect(html).not.toContain('arrived')
    expect(html).toContain('set a new destination')
    expect(html).not.toContain('class="waits')
    editor.switchMode('edit')
    vi.restoreAllMocks()
  })

  it('shows a pause plainly, with Continue, wherever the side panel is', () => {
    editor.load(createMap())
    editor.switchMode('play')
    setMode('rules')
    clickHex('1,1')
    editSession((s) => ({
      ...s,
      travel: {
        ...s.travel,
        pendingChecks: [{ id: 'c1', event: 'ENCOUNTER_CHECK_REQUIRED', context: {} }],
      },
    }))
    editor.panelView = 'library'
    const html = render(PlayStrip).body
    expect(html).toContain('class="waits')
    expect(html).toContain('waiting for you')
    expect(html).toMatch(/<button class="go[^>]*>Continue</)
    editor.panelView = 'tool'
    editor.switchMode('edit')
  })
})
