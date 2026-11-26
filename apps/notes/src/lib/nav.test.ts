import { describe, expect, it } from 'vitest'
import { getProvider } from '@open-tabletop/note-refs'
import { formatView, parseView } from './nav.svelte'

describe("Notes' addresses", () => {
  it('open a page by its id', () => {
    expect(parseView('#/page/p1')).toEqual({ name: 'page', id: 'p1' })
    expect(formatView({ name: 'page', id: 'p 1' })).toBe('#/page/p%201')
    expect(parseView('#/nothing')).toEqual({ name: 'welcome' })
  })

  it('read the notes of the other apps, as the provider writes them', () => {
    const url = getProvider('opentabletop').url('npcs/Old Tobin', {
      appUrl: '../notes/',
      campaign: 'vale',
      from: 'map:a1b2#0608',
    })!
    expect(parseView(url.slice(url.indexOf('#')))).toEqual({
      name: 'ref',
      path: 'npcs/Old Tobin',
      campaign: 'vale',
      from: 'map:a1b2#0608',
    })
  })
})
