import { describe, expect, it } from 'vitest'
import { getProvider, providerSettings } from './providers'

const sb = getProvider('silverbullet')
const obsidian = getProvider('obsidian')
const notes = getProvider('opentabletop')

describe('note providers', () => {
  it('builds SilverBullet page URLs', () => {
    expect(sb.url('Kal-Arath/Hexes/0101', { baseUrl: 'http://localhost:3001' })).toBe(
      'http://localhost:3001/Kal-Arath/Hexes/0101',
    )
    expect(sb.url('/Mapas/Torre del Búho.md', { baseUrl: 'http://sb.local/ ' })).toBe(
      'http://sb.local/Mapas/Torre%20del%20B%C3%BAho',
    )
  })

  it('builds Obsidian URIs', () => {
    expect(obsidian.url('Hexes/Torre del Búho.md', { vault: 'Kal Arath' })).toBe(
      'obsidian://open?vault=Kal%20Arath&file=Hexes%2FTorre%20del%20B%C3%BAho',
    )
  })

  it('builds addresses of OpenTabletop Notes, with where the link is and what it is', () => {
    expect(notes.url('/npcs/Old Tobin.md', { appUrl: '../notes/' })).toBe(
      '../notes/#/ref/npcs/Old%20Tobin',
    )
    expect(
      notes.url('Old Tobin', { appUrl: '../notes/', campaign: 'vale', from: 'character:kael' }),
    ).toBe('../notes/#/ref/Old%20Tobin?in=vale&from=character%3Akael')
    expect(notes.url('x', {})).toBeNull()
  })

  it('returns null when settings or path are missing', () => {
    expect(sb.url('x', { baseUrl: '' })).toBeNull()
    expect(sb.url('  ', { baseUrl: 'http://a' })).toBeNull()
    expect(obsidian.url('x', providerSettings(obsidian, undefined))).toBeNull()
  })

  it('fills defaults and falls back to the first provider', () => {
    expect(providerSettings(sb, undefined)).toEqual({ baseUrl: 'http://localhost:3001' })
    expect(getProvider('nope').id).toBe('opentabletop')
  })
})
