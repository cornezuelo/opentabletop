import { describe, expect, it, vi } from 'vitest'
import { render } from 'svelte/server'
import { applyResult, partyOf } from '@open-tabletop/session'
import PlayPanel from '../../components/PlayPanel.svelte'
import PlayStrip from '../../components/PlayStrip.svelte'
import { exampleMaps } from '../io/examples'
import { parseMapFile } from '../io/otd'
import { editor } from '../store/editor.svelte'
import { chooseOnMap, clickHex, editSession, restartRules, sessionOf, setMode, step } from './play'
import { activeSystem } from './systems'

/**
 * The fight view in Map's Play: the Grey Marches' Company stands against a grey wolf and its pack leader;
 * everyone is a card in the order of play (each one's health, the one acting large), the
 * wolf to strike is chosen on the map, and the blow shows on its card and in the fight's log.
 */
describe('the fight view', () => {
  it('everyone as a card, the target chosen on the map, the blow told', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.4)
    editor.open(parseMapFile(exampleMaps().find((m) => m.id === 'greymarches1')!.json))
    editor.switchMode('play')
    clickHex('7,7')
    setMode('rules')
    await restartRules(editor.campaign.system!, 'spring')
    const session = () => sessionOf(editor.map.play!)!
    const rules = partyOf(activeSystem())
    editSession((s) =>
      applyResult(s, { effects: { 'present.grey-wolf': 1, 'present.pack-leader': 1 } }, {}, rules),
    )
    step({ type: 'action', id: 'stand' })
    // The foes go by themselves until a companion's turn waits for you.
    expect(session().encounter?.stage).toBe('acting')
    let html = render(PlayPanel).body.replace(/<!--[^>]*-->/g, '')
    const fighters = session().encounter!.order.length
    expect(html.match(/class="fighter/g)).toHaveLength(fighters)
    expect(html).toContain('aria-current="step"')
    expect(html).toContain('Grey wolf')
    expect(html).toContain('Pack leader')
    // Each one's main value, as its sheet draws it.
    expect(html).toMatch(/class="glance/)
    expect(html).toMatch(/class="main/)
    // Each side its band, a face on every card, the round's order in a strip on top.
    expect(html).toMatch(/class="band foes/)
    expect(html).toMatch(/class="band party/)
    expect(html.match(/class="face/g)!.length).toBe(fighters * 2)
    expect(html).toMatch(/class="strip/)
    // A companion's turn: the one action on a foe is armed in the turn's bar, and each
    // wolf's card is the button that takes it on them.
    expect(html).toMatch(/class="arm[^"]*" aria-pressed="true"/)
    expect(html.match(/<button class="pick/g)).toHaveLength(2)
    expect(html).toMatch(/aria-label="Strike one down: Grey wolf"/)

    // Strike taken without a foe: the panel asks whom, and the wolves' cards are what's clicked.
    step({ type: 'action', id: 'strike' })
    const choices = session().travel.waiting?.choices ?? []
    expect(choices.length).toBe(2)
    html = render(PlayPanel).body.replace(/<!--[^>]*-->/g, '')
    expect(html.match(/<button class="pick/g)).toHaveLength(2)
    expect(html).toContain('Click their card.')
    const wolf = choices[0]!
    const before = session().present!.find((p) => p.character.id === wolf)!.character.values.health!
    // Clicked on the map, as its card would be.
    expect(chooseOnMap(wolf)).toBe(true)
    const hit = session().present?.find((p) => p.character.id === wolf)?.character.values.health
    expect(hit === undefined || hit < before).toBe(true)
    html = render(PlayPanel).body.replace(/<!--[^>]*-->/g, '')
    // The fight's moments under the cards, and the blow just struck told up front.
    expect(html).toContain('class="log')
    expect(html).toMatch(/class="last/)
    expect(chooseOnMap('nobody')).toBe(false)

    // Fought on: a foe's turn before another foe's waits for Next, in the panel and the strip.
    let read = false
    for (let i = 0; i < 20 && session().encounter && !read; i++) {
      const fight = session().encounter!
      if (fight.stage === 'shown') {
        html = render(PlayPanel).body.replace(/<!--[^>]*-->/g, '')
        // The button says who acts next; the strip, who has acted.
        expect(html).toMatch(/<button class="button primary[^>]*>Next: [^<]+</)
        expect(render(PlayStrip).body).toContain('has acted. Next:')
        expect(render(PlayStrip).body).toMatch(/>\s*Next\s*</)
        // Next plays the foe's turn (which may wait again, before another foe's).
        const before = session().journal.length
        step({ type: 'encounter', what: 'next' })
        expect(session().journal.length).toBeGreaterThan(before)
        read = true
      } else if (session().travel.waiting?.choices?.length)
        chooseOnMap(session().travel.waiting!.choices![0]!)
      else step({ type: 'action', id: 'strike' })
    }
    expect(read).toBe(true)
    editor.switchMode('edit')
    vi.restoreAllMocks()
  })
})
