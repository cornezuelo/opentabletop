import { describe, expect, it, vi } from 'vitest'
import { render } from 'svelte/server'
import { createMap } from '@open-tabletop/map'
import { shownAt } from '@open-tabletop/session'
import { beatsSeen, lastNotableBeat, pacing } from '@open-tabletop/travel-ui'
import PlayStrip from '../../components/PlayStrip.svelte'
import PlayPanel from '../../components/PlayPanel.svelte'
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
    // Told at once (a march told a place at a time is pace.test.ts's).
    pacing.finish()
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
    // An important moment would be told in the news' place: put away, the news show.
    const notable = lastNotableBeat(session())
    if (notable) beatsSeen.putAway(session(), notable.entries[0]!)
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

describe('important moments up front', () => {
  it('the omen of the Wyrm is told over the map until put away; the journal tells moments', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.3)
    editor.open(parseMapFile(exampleMaps().find((m) => m.id === 'greymarches1')!.json))
    editor.switchMode('play')
    clickHex('7,7')
    setMode('rules')
    await restartRules(editor.campaign.system!, 'spring')
    const session = () => sessionOf(editor.map.play!)!
    // Camping day after day: a dawn draws the Wyrm's sign (notable: true), though nothing stops.
    let beat = lastNotableBeat(session())
    for (let day = 0; day < 30 && !beat?.entries.some((e) => e.text?.includes('sulphur')); day++) {
      const check = session().travel.pendingChecks[0]
      if (check) step({ type: 'resolveCheck', id: check.id })
      else if (session().travel.waiting) step({ type: 'resume' })
      else step({ type: 'action', id: 'camp' })
      beat = lastNotableBeat(session())
    }
    expect(beat?.entries.some((e) => e.text?.includes('sulphur'))).toBe(true)
    let html = render(PlayStrip).body.replace(/<!--[^>]*-->/g, '')
    // Told in full in the news' place, with × to put it away (nothing waits for it).
    expect(html).toContain('class="notable')
    expect(html).toContain('Scorched trees and a smell of sulphur')
    expect(html).not.toContain('class="news')
    expect(html).toContain('aria-label="Put it away"')
    // Stopping at every important moment: it waits for Continue, holding the actions.
    beatsSeen.setStop(true)
    expect(render(PlayStrip).body).toMatch(/<button class="primary[^>]*>Continue</)
    expect(render(PlayPanel).body).toMatch(/class="actions[^"]*held/)
    beatsSeen.setStop(false)
    expect(render(PlayPanel).body).not.toMatch(/class="actions[^"]*held/)
    beatsSeen.putAway(session(), beat!.entries[0]!)
    html = render(PlayStrip).body
    expect(html).not.toContain('class="notable')
    expect(html).toContain('class="news')
    // The journal in the panel: moments with a title each, the newest unfolded.
    const panel = render(PlayPanel).body.replace(/<!--[^>]*-->/g, '')
    expect(panel).toContain('class="moment')
    expect(panel).toContain('class="beat')
    expect(panel).toMatch(/aria-expanded="true"/)
    editor.switchMode('edit')
    vi.restoreAllMocks()
  })
})
