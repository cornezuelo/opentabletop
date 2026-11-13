import { afterEach, describe, expect, it, vi } from 'vitest'
import { render } from 'svelte/server'
import PlayPanel from '../../components/PlayPanel.svelte'
import { editor } from '../store/editor.svelte'
import { exampleMaps } from '../io/examples'
import { parseMapFile } from '../io/otd'
import { clickHex, restartRules, setMode } from './play'

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
})
