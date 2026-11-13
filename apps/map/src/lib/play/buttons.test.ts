import { afterEach, describe, expect, it, vi } from 'vitest'
import { render } from 'svelte/server'
import { showInParty, tripTab } from '@open-tabletop/travel-ui'
import PlayPanel from '../../components/PlayPanel.svelte'
import { editor } from '../store/editor.svelte'
import { exampleMaps } from '../io/examples'
import { parseMapFile } from '../io/otd'
import { clickHex, editSession, restartRules, sessionOf, setMode } from './play'

describe("the party's buttons on the map", () => {
  afterEach(() => {
    vi.restoreAllMocks()
    editor.switchMode('edit')
  })

  it('come in the groups the Grey Marches declare, each under its name, in their order', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    editor.open(parseMapFile(exampleMaps().find((m) => m.id === 'greymarches1')!.json))
    editor.switchMode('play')
    clickHex('7,7')
    setMode('rules')
    await restartRules(editor.campaign.system!, 'spring')
    const html = render(PlayPanel).body.replace(/<!--[^>]*-->/g, '')
    const actions = html.slice(html.indexOf('class="actions'))
    const at = (text: string) => actions.indexOf(text)
    const heads = [...actions.matchAll(/class="overline group[^"]*">([^<]+)/g)].map((m) =>
      m[1]!.trim(),
    )
    // Outside a fight, its own group has nothing to show.
    expect(heads).toEqual(['On the road', 'Rest and camp', 'Here'])
    expect(at('On the road')).toBeLessThan(at('>March'))
    expect(at('>March')).toBeLessThan(at('Rest and camp'))
    expect(at('Rest and camp')).toBeLessThan(at('>Camp'))
    expect(at('>Camp')).toBeLessThan(at('Here'))
    expect(at('Here')).toBeLessThan(at('>Forage'))
  })

  it('show the party at a glance under them: the Company and its characters, who acts outlined', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    editor.open(parseMapFile(exampleMaps().find((m) => m.id === 'greymarches1')!.json))
    editor.switchMode('play')
    clickHex('7,7')
    setMode('rules')
    await restartRules(editor.campaign.system!, 'spring')
    const members = sessionOf(editor.map.play!)!.members!
    expect(members.length).toBeGreaterThan(1)
    editSession((s) => ({ ...s, acting: members[1]!.id }))
    const html = render(PlayPanel).body.replace(/<!--[^>]*-->/g, '')
    const glance = html.slice(
      html.indexOf('aria-label="The party at a glance"'),
      html.indexOf('role="tablist"'),
    )
    expect(glance).toContain('The Company')
    for (const m of members) expect(glance).toContain(m.name!)
    // Each with its main value (the Grey Marches' health), who acts outlined.
    expect(glance.match(/aria-label="Health"/g)?.length).toBe(members.length)
    expect(glance.match(/<button class="[^"]*\bacting\b/g)?.length).toBe(1)
    // A card clicked shows the whole sheet in the Party tab.
    showInParty(members[0]!.id)
    expect(tripTab.chosen).toBe('party')
    expect(tripTab.shown?.id).toBe(members[0]!.id)
  })
})
