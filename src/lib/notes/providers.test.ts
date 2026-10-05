import { describe, expect, it } from 'vitest'
import { getProvider, providerSettings } from './providers'

const sb = getProvider('silverbullet')
const obsidian = getProvider('obsidian')

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

  it('returns null when settings or path are missing', () => {
    expect(sb.url('x', { baseUrl: '' })).toBeNull()
    expect(sb.url('  ', { baseUrl: 'http://a' })).toBeNull()
    expect(obsidian.url('x', providerSettings(obsidian, undefined))).toBeNull()
  })

  it('fills defaults and falls back to the first provider', () => {
    expect(providerSettings(sb, undefined)).toEqual({ baseUrl: 'http://localhost:3001' })
    expect(getProvider('nope').id).toBe('silverbullet')
  })
})
