import { describe, expect, it } from 'vitest'
import { keyCaps, keysText } from './shortcuts'

describe('keyCaps', () => {
  it('splits a combination into its keys, named in the language', () => {
    expect(keyCaps('Ctrl+Shift+Z', 'en').map((cap) => cap.label)).toEqual(['Ctrl', 'Shift', 'Z'])
    expect(keyCaps('Ctrl+Shift+Z', 'es').map((cap) => cap.label)).toEqual(['Ctrl', 'Mayús', 'Z'])
    expect(keyCaps('Delete', 'es')[0].label).toBe('Supr')
  })

  it('writes a letter as its cap and keeps keys it has no name for', () => {
    expect(keyCaps('d', 'en')[0].label).toBe('D')
    expect(keyCaps('F1', 'en')[0].label).toBe('F1')
    expect(keyCaps('[', 'en')[0].label).toBe('[')
  })

  it('reads a + alone, or last, as the key itself', () => {
    expect(keyCaps('+', 'en').map((cap) => cap.label)).toEqual(['+'])
    expect(keyCaps('Ctrl++', 'en').map((cap) => cap.label)).toEqual(['Ctrl', '+'])
  })

  it('tells what the mouse does from the keys', () => {
    expect(keyCaps('Shift+Drag', 'es')).toEqual([
      { label: 'Mayús', mouse: false },
      { label: 'arrastrar', mouse: true },
    ])
    expect(keyCaps('Right click', 'es')).toEqual([{ label: 'clic derecho', mouse: true }])
  })

  it('falls back to English in a language it has no names for', () => {
    expect(keyCaps('Shift+Space', 'fr').map((cap) => cap.label)).toEqual(['Shift', 'Space'])
  })
})

describe('keysText', () => {
  it('writes the ways of pressing it in one line', () => {
    expect(keysText(['Ctrl+Shift+Z', 'Ctrl+Y'], 'es')).toBe('Ctrl+Mayús+Z / Ctrl+Y')
  })
})
