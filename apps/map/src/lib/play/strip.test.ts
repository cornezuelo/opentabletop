import { describe, expect, it, vi } from 'vitest'
import { render } from 'svelte/server'
import { createMap } from '@open-tabletop/map'
import { shownAt } from '@open-tabletop/session'
import PlayStrip from '../../components/PlayStrip.svelte'
import { editor } from '../store/editor.svelte'
import { exampleMaps } from '../io/examples'
import { parseMapFile } from '../io/otd'
import { clickHex, editSession, restartRules, sessionOf, setMode, step } from './play'

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

  it('tells the story of the last step first, and the weather by its name', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.3)
    editor.open(parseMapFile(exampleMaps().find((m) => m.id === 'greymarches1')!.json))
    editor.switchMode('play')
    clickHex('7,7')
    setMode('rules')
    await restartRules(editor.campaign.system!, 'spring')
    const session = () => sessionOf(editor.map.play!)!
    step({ type: 'action', id: 'camp' })
    const weather = session().travel.weather!
    expect(weather).toBeTruthy()
    const html = render(PlayStrip).body.replace(/<!--[^>]*-->/g, '')
    // The weather as the table said it, never its id alone.
    const told = session().journal.findLast(
      (e) => e.code === 'ORACLE_RESULT' && (e.data?.value as { weather?: string })?.weather,
    )!.text!
    expect(html).toContain(`Weather: ${told}`)
    expect(html).not.toContain(`Weather: ${weather}<`)
    // What happened: the story lines of the camp, each apart, the newest marked.
    const lines = html.match(/class="last[^"]*"/g) ?? []
    expect(lines.length).toBeGreaterThan(0)
    expect(lines.length).toBeLessThanOrEqual(3)
    expect(html).toMatch(/class="last[^"]*newest/)
    editor.switchMode('edit')
    vi.restoreAllMocks()
  })
})
