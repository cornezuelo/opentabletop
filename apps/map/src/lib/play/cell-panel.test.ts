import { describe, expect, it, vi } from 'vitest'
import { render } from 'svelte/server'
import { createMap } from '@open-tabletop/map'
import HexInfo from '../../components/hex/HexInfo.svelte'
import { editor } from '../store/editor.svelte'

// DOMPurify needs a browser; these tests look at the panel, not at the Markdown.
vi.mock('../markdown', () => ({ renderMarkdown: (text: string) => text }))

const panel = () => render(HexInfo).body

describe('the cell panel', () => {
  it('offers what an empty cell could hold, without its fields', () => {
    editor.load(createMap())
    editor.tool = 'select'
    editor.selected = '1,1'
    const html = panel()
    for (const add of ['+ Notes', '+ Linked note', '+ Point of interest', '+ Tag', '+ Field'])
      expect(html).toContain(add)
    expect(html).not.toContain('Add tag')
    expect(html).not.toContain('Points of interest')
  })

  it('shows what a cell holds, and offers only the rest', () => {
    const map = createMap()
    map.hexes['1,1'] = { tags: ['ruins'] }
    editor.load(map)
    editor.tool = 'select'
    editor.selected = '1,1'
    const html = panel()
    expect(html).toContain('ruins')
    expect(html).not.toContain('+ Tag')
    expect(html).toContain('+ Notes')
  })

  it('in Play is to read: nothing to fill in, nothing to clear', () => {
    const map = createMap()
    map.hexes['1,1'] = { name: 'Old well', notes: 'Deep.', tags: ['ruins'] }
    editor.load(map)
    editor.switchMode('play')
    editor.tool = 'select'
    editor.selected = '1,1'
    const html = panel()
    expect(html).toContain('Old well')
    expect(html).toContain('Deep.')
    expect(html).toContain('ruins')
    expect(html).not.toMatch(/<(input|textarea|select)\b/)
    expect(html).not.toContain('Clear cell')
    expect(html).not.toContain('+ Notes')
    editor.switchMode('edit')
  })
})
