import { afterEach, describe, expect, it, vi } from 'vitest'
import { render } from 'svelte/server'
import { partyToken } from '@open-tabletop/map'
import { pacing } from '@open-tabletop/travel-ui'
import PlayPanel from '../../components/PlayPanel.svelte'
import { editor } from '../store/editor.svelte'
import { exampleMaps } from '../io/examples'
import { parseMapFile } from '../io/otd'
import { clickHex, restartRules, sessionOf, setMode, step } from './play'
import { toldParty } from './present'

describe('a march told a place at a time on the map', () => {
  afterEach(() => {
    pacing.finish()
    vi.useRealTimers()
    vi.restoreAllMocks()
    editor.switchMode('edit')
  })

  it('moves the party cell by cell, the panel following it, and the next step tells the rest at once', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    editor.open(parseMapFile(exampleMaps().find((m) => m.id === 'greymarches1')!.json))
    editor.switchMode('play')
    clickHex('7,7')
    setMode('rules')
    await restartRules(editor.campaign.system!, 'spring')
    pacing.setPace('quick')
    vi.useFakeTimers()
    const session = () => sessionOf(editor.map.play!)!
    clickHex('7,3')
    const before = editor.map.play!.trail.length
    step({ type: 'action', id: 'march', with: { until: 'destination' } })
    const entered = session()
      .journal.slice(session().lastStep! - 1)
      .filter((e) => e.code === 'PLACE_ENTERED')
      .map((e) => String(e.data?.place))
    expect(entered.length).toBeGreaterThan(1)
    // The token is already where the march ended; it's drawn where the telling is.
    const end = partyToken(editor.map)!.hex
    expect(end).toBe(entered.at(-1))
    const moves: string[] = []
    const stop = pacing.listen(() => moves.push(toldParty().hex!))
    expect(toldParty().hex).toBe(entered[0])
    expect(toldParty().trail.length).toBeLessThan(editor.map.play!.trail.length)
    expect(editor.map.play!.trail.length - before).toBe(entered.length)
    // While it's told, the trip's buttons wait, and it can be told at once.
    let html = render(PlayPanel).body
    expect(html).toContain('The march goes on…')
    expect(html).toContain('Tell it all')
    const shown = pacing.view(session())
    expect(shown.journal.length).toBeLessThan(session().journal.length)
    expect(shown.travel.location).toBe(entered[0])
    // Place after place, without an important moment on the way, to the end.
    while (pacing.tells(session()) && !pacing.holds(session())) vi.advanceTimersByTime(450)
    if (pacing.holds(session())) {
      pacing.resume()
      while (pacing.tells(session())) {
        if (pacing.holds(session())) pacing.resume()
        vi.advanceTimersByTime(450)
      }
    }
    // Each cell entered in turn (a hold on the way tells its cell again).
    expect(moves.filter((m, i) => m !== moves[i - 1])).toEqual(entered.slice(1))
    expect(toldParty().trail).toEqual(editor.map.play!.trail)
    html = render(PlayPanel).body
    expect(html).not.toContain('Tell it all')
    stop()
  })

  it('tells the rest at once when the player takes another step', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    editor.open(parseMapFile(exampleMaps().find((m) => m.id === 'greymarches1')!.json))
    editor.switchMode('play')
    clickHex('7,7')
    setMode('rules')
    await restartRules(editor.campaign.system!, 'spring')
    pacing.setPace('quick')
    vi.useFakeTimers()
    const session = () => sessionOf(editor.map.play!)!
    clickHex('7,3')
    step({ type: 'action', id: 'march', with: { until: 'destination' } })
    expect(pacing.tells(session())).toBe(true)
    expect(toldParty().hex).not.toBe(partyToken(editor.map)!.hex)
    step({ type: 'action', id: 'camp' })
    expect(toldParty().hex).toBe(partyToken(editor.map)!.hex)
  })
})
